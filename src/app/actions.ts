'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { checkDuplicate, computeFingerprint } from '@/lib/dedupe';
import { runTriageWorkflow } from '@/lib/workflow';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendEmail } from '@/lib/email';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { login as authLogin, logout as authLogout, getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { sendWebhook } from '@/lib/webhook';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

const TicketSchema = z.object({
  customer_email: z.string().email(),
  customer_name: z.string().min(2),
  subject: z.string().min(5),
  message: z.string().min(10),
  product_area: z.string(),
  // attachments is handled separately as File
});

export async function createTicket(formData: FormData) {
  // Honeypot check
  const honeypot = formData.get('website_url');
  if (honeypot) {
      console.warn("Honeypot triggered. Rejecting submission.");
      return; // Silent rejection
  }

  // Rate Limit Check
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
      throw new Error("Too many requests. Please try again later.");
  }

  const rawData = {
    customer_email: formData.get('customer_email'),
    customer_name: formData.get('customer_name'),
    subject: formData.get('subject'),
    message: formData.get('message'),
    product_area: formData.get('product_area'),
  };

  const validated = TicketSchema.parse(rawData);
  const fingerprint = computeFingerprint(validated.message);

  // Handle File Upload
  let attachmentUrl: string | null = null;
  const file = formData.get('attachment') as File;
  
  if (file && file.size > 0) {
    try {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Only PNG, JPG, and PDF are allowed.");
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("File too large. Max size is 10MB.");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      // Randomize filename
      const ext = file.name.split('.').pop();
      const filename = `${randomUUID()}.${ext}`;
      const uploadDir = join(process.cwd(), 'private', 'uploads');
      
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), buffer);
      
      attachmentUrl = `/api/uploads/${filename}`;
    } catch (e) {
      console.error("Failed to upload file:", e);
      // Continue without attachment or throw? For MVP, continue.
    }
  }

  // Dedupe
  const existingTicketId = await checkDuplicate(validated.customer_email, validated.message);
  
  if (existingTicketId) {
    console.log(`Deduped ticket to ${existingTicketId}`);
    // Add as message to existing ticket
    await prisma.ticketMessage.create({
        data: {
            ticket_id: existingTicketId,
            sender_type: 'customer',
            message_body: validated.message,
            attachments: attachmentUrl,
            fingerprint: fingerprint
        }
    });
    // Maybe update status if it was closed? For now, just attach.
    redirect(`/tickets/${existingTicketId}`); // In real app, might show "Thanks" page.
  }

  // Create New Ticket
  const ticket = await prisma.ticket.create({
    data: {
      customer_email: validated.customer_email,
      customer_name: validated.customer_name,
      subject: validated.subject,
      product_area: validated.product_area,
      status: 'new',
      messages: {
          create: {
              sender_type: 'customer',
              message_body: validated.message,
              attachments: attachmentUrl,
              fingerprint: fingerprint
          }
      }
    },
  });

  // Trigger workflow
  await runTriageWorkflow(ticket.id);

  redirect(`/tickets/${ticket.id}`); // Or success page
}

// Admin Actions

async function checkAuth() {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }
}

export async function login(prevState: any, formData: FormData) {
    const password = formData.get('password') as string;
    
    if (!password) {
        return { error: 'Password is required' };
    }
    
    const success = await authLogin(password);
    if (success) {
        redirect('/inbox');
    } else {
        return { error: 'Invalid password' };
    }
}

export async function logout() {
    await authLogout();
    redirect('/login');
}

export async function approveTicket(ticketId: string) {
    await checkAuth();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || !ticket.ai_suggested_reply) throw new Error("Ticket not found or no reply");

    await sendEmail({
        to: ticket.customer_email,
        subject: `Re: ${ticket.subject}`,
        body: ticket.ai_suggested_reply,
        ticketId: ticket.id
    });

    await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'replied' }
    });
    
    await prisma.auditEvent.create({
        data: {
            ticket_id: ticketId,
            action: 'approve',
            actor: 'admin',
            details: 'Approved via Inbox'
        }
    });

    // Trigger webhook (non-blocking)
    sendWebhook('ticket.approved', ticketId).catch(err => 
        console.error('Webhook failed:', err)
    );

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath('/inbox');
}

export async function saveDraft(ticketId: string, draft: string) {
    await checkAuth();
    await prisma.ticket.update({
        where: { id: ticketId },
        data: { ai_suggested_reply: draft }
    });
    revalidatePath(`/tickets/${ticketId}`);
}

export async function escalateTicket(ticketId: string) {
    await checkAuth();
    await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'escalated' }
    });
    
    await prisma.auditEvent.create({
        data: {
            ticket_id: ticketId,
            action: 'escalate',
            actor: 'admin',
            details: 'Escalated via Inbox'
        }
    });
    
    // Trigger webhook (non-blocking)
    sendWebhook('ticket.escalated', ticketId).catch(err => 
        console.error('Webhook failed:', err)
    );
    
    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath('/inbox');
}

export async function retryPipeline(ticketId: string) {
    await checkAuth();
    await runTriageWorkflow(ticketId);
    revalidatePath(`/tickets/${ticketId}`);
}

const KBSchema = z.object({
    title: z.string().min(5),
    body: z.string().min(20),
    tags: z.string().optional(),
});

export async function addKBDocument(formData: FormData) {
    await checkAuth();
    const rawData = {
        title: formData.get('title'),
        body: formData.get('body') || '',
        tags: formData.get('tags'),
    };
    
    // Handle file upload if provided
    const file = formData.get('file') as File;
    let fileUrl: string | null = null;
    let bodyText = rawData.body as string;
    
    if (file && file.size > 0) {
        try {
            // Validate file type
            const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error("Invalid file type. Only PNG, JPG, and PDF are allowed.");
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error("File too large. Max size is 5MB.");
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split('.').pop();
            const filename = `kb-${randomUUID()}.${ext}`;
            const uploadDir = join(process.cwd(), 'private', 'uploads', 'kb');
            
            await mkdir(uploadDir, { recursive: true });
            await writeFile(join(uploadDir, filename), buffer);
            
            fileUrl = `/api/uploads/kb/${filename}`;
            
            // If body is empty but file exists, add file link to body
            if (!bodyText || bodyText.trim() === '') {
                bodyText = `File uploaded: ${file.name}\n\nDownload: ${fileUrl}`;
            } else {
                bodyText += `\n\n📎 File: ${fileUrl}`;
            }
        } catch (e) {
            console.error("Failed to upload KB file:", e);
            // Continue without file
        }
    }
    
    // Validate with updated body
    const validated = KBSchema.parse({
        ...rawData,
        body: bodyText
    });
    
    await prisma.kBDocument.create({
        data: validated
    });
    
    revalidatePath('/kb');
}
