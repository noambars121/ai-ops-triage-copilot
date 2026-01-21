import { prisma } from './db';
import { logRun } from './logger';

export type WebhookEvent = 'ticket.approved' | 'ticket.escalated' | 'ticket.created' | 'ticket.failed';

interface WebhookPayload {
  event: WebhookEvent;
  ticket_id: string;
  ticket_subject: string;
  customer_email: string;
  status: string;
  timestamp: string;
  ai_category?: string | null;
  ai_urgency?: string | null;
  ai_confidence?: number | null;
}

export async function sendWebhook(event: WebhookEvent, ticketId: string) {
  const webhookUrl = process.env.WEBHOOK_URL;
  
  // If no webhook URL configured, skip silently
  if (!webhookUrl || webhookUrl === '') {
    return;
  }

  const startedAt = new Date();
  let attempts = 0;
  const maxRetries = 3;

  // Fetch ticket data
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      subject: true,
      customer_email: true,
      status: true,
      ai_category: true,
      ai_urgency: true,
      ai_confidence: true,
    }
  });

  if (!ticket) {
    console.error(`Webhook: Ticket ${ticketId} not found`);
    return;
  }

  const payload: WebhookPayload = {
    event,
    ticket_id: ticket.id,
    ticket_subject: ticket.subject,
    customer_email: ticket.customer_email,
    status: ticket.status,
    timestamp: new Date().toISOString(),
    ai_category: ticket.ai_category,
    ai_urgency: ticket.ai_urgency,
    ai_confidence: ticket.ai_confidence,
  };

  while (attempts < maxRetries) {
    try {
      attempts++;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SupportTriageCopilot/1.0',
          'X-Webhook-Event': event,
          'X-Webhook-Delivery-Attempt': attempts.toString(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }

      // Success
      await logRun({
        ticketId,
        step: 'webhook',
        status: 'success',
        startedAt,
        finishedAt: new Date(),
        payload: { event, attempts, url: webhookUrl },
      });

      return;

    } catch (error: any) {
      console.error(`Webhook attempt ${attempts} failed:`, error.message);

      if (attempts === maxRetries) {
        // Final failure
        await logRun({
          ticketId,
          step: 'webhook',
          status: 'failed',
          startedAt,
          finishedAt: new Date(),
          errorCode: error.code || 'WEBHOOK_FAILED',
          errorMessage: error.message,
          payload: { event, attempts, url: webhookUrl },
        });
        return;
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
    }
  }
}
