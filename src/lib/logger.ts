import { prisma } from './db';

export type LogStep = 'triage' | 'rag_search' | 'email_send' | 'dedupe' | 'webhook' | 'system';
export type LogStatus = 'success' | 'failed' | 'pending';

export async function logRun({
  ticketId,
  step,
  status,
  startedAt,
  finishedAt,
  errorCode,
  errorMessage,
  payload,
}: {
  ticketId?: string;
  step: LogStep;
  status: LogStatus;
  startedAt: Date;
  finishedAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  payload?: any;
}) {
  try {
    const latencyMs = finishedAt ? finishedAt.getTime() - startedAt.getTime() : undefined;
    
    // Redact and truncate payload
    let payloadPreview = '';
    if (payload) {
      try {
        const str = JSON.stringify(payload);
        // Simple redaction of email-like patterns
        const redacted = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED]');
        payloadPreview = redacted.substring(0, 200);
      } catch (e) {
        payloadPreview = 'Error stringifying payload';
      }
    }

    await prisma.runLog.create({
      data: {
        ticket_id: ticketId,
        step,
        status,
        started_at: startedAt,
        finished_at: finishedAt,
        latency_ms: latencyMs,
        error_code: errorCode,
        error_message: errorMessage,
        payload_preview: payloadPreview,
      },
    });
  } catch (error) {
    console.error('Failed to write run log:', error);
  }
}
