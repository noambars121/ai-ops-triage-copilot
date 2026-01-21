import { prisma } from './db';
import { logRun } from './logger';
import { createHash } from 'crypto';

function generateFingerprint(text: string): string {
  // Normalize: lowercase, remove non-alphanumeric, trim
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return createHash('sha256').update(normalized).digest('hex');
}

function getTokens(text: string): Set<string> {
    return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2));
}
  
function jaccardSimilarity(text1: string, text2: string): number {
    const tokens1 = getTokens(text1);
    const tokens2 = getTokens(text2);
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
}

export async function checkDuplicate(email: string, message: string): Promise<string | null> {
  const fingerprint = generateFingerprint(message);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  // 1. Exact Match (Fingerprint)
  const exactMatch = await prisma.ticketMessage.findFirst({
    where: {
      fingerprint: fingerprint,
      created_at: { gte: tenMinutesAgo },
      ticket: { customer_email: email }
    },
    include: { ticket: true }
  });

  if (exactMatch) {
    await logRun({
      ticketId: exactMatch.ticket_id,
      step: 'dedupe',
      status: 'success',
      startedAt: new Date(),
      finishedAt: new Date(),
      payload: { duplicateOf: exactMatch.ticket_id, type: 'exact' },
    });
    return exactMatch.ticket_id;
  }

  // 2. Fuzzy Match
  // Fetch recent messages from this user to compare
  const recentMessages = await prisma.ticketMessage.findMany({
    where: {
        created_at: { gte: tenMinutesAgo },
        ticket: { customer_email: email }
    },
    select: { ticket_id: true, message_body: true, id: true }
  });

  for (const msg of recentMessages) {
      const similarity = jaccardSimilarity(message, msg.message_body);
      if (similarity > 0.75) { // 75% similarity threshold
          await logRun({
            ticketId: msg.ticket_id,
            step: 'dedupe',
            status: 'success',
            startedAt: new Date(),
            finishedAt: new Date(),
            payload: { duplicateOf: msg.ticket_id, type: 'fuzzy', similarity },
          });
          return msg.ticket_id;
      }
  }

  return null;
}

export function computeFingerprint(text: string) {
    return generateFingerprint(text);
}
