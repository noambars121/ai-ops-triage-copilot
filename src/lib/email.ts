import { prisma } from './db';
import { logRun } from './logger';

export async function sendEmail({
  to,
  subject,
  body,
  ticketId,
}: {
  to: string;
  subject: string;
  body: string;
  ticketId?: string;
}) {
  const startedAt = new Date();
  let outboxId: string | null = null;

  try {
    // 1. Write to DB Outbox (always)
    const outbox = await prisma.emailOutbox.create({
      data: {
        to,
        subject,
        body,
        status: 'pending',
      },
    });
    outboxId = outbox.id;

    // 2. Simulate Sending Delay (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Simulate Failure Toggle
    if (process.env.SIMULATE_EMAIL_FAILURE === 'true') {
        throw new Error("Simulated email provider failure");
    }

    // 4. Mark as Sent
    await prisma.emailOutbox.update({
      where: { id: outbox.id },
      data: {
        status: 'sent',
        sent_at: new Date(),
      },
    });

    await logRun({
      ticketId,
      step: 'email_send',
      status: 'success',
      startedAt,
      finishedAt: new Date(),
      payload: { emailId: outbox.id, to },
    });

    return outbox.id;
  } catch (error: any) {
    console.error('Email send failed:', error);
    
    if (outboxId) {
        await prisma.emailOutbox.update({
            where: { id: outboxId },
            data: {
                status: 'failed',
                error: error.message
            }
        });
    }

    await logRun({
      ticketId,
      step: 'email_send',
      status: 'failed',
      startedAt,
      finishedAt: new Date(),
      errorMessage: error.message,
    });
    throw error;
  }
}
