import { prisma } from './db';
import { logRun } from './logger';

export interface KBSnippet {
  id: string;
  title: string;
  excerpt: string;
  score: number;
}

export async function searchKB(query: string, ticketId?: string): Promise<KBSnippet[]> {
  const startedAt = new Date();
  let attempts = 0;
  const maxRetries = 3;

  while (attempts < maxRetries) {
      try {
        attempts++;
        const docs = await prisma.kBDocument.findMany();
        
        if (docs.length === 0) return [];

        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        if (terms.length === 0) return [];

        const scored = docs.map(doc => {
            let score = 0;
            const titleLower = doc.title.toLowerCase();
            const bodyLower = doc.body.toLowerCase();

            terms.forEach(term => {
            if (titleLower.includes(term)) score += 3;
            // Simple count of occurrences in body
            const bodyMatches = bodyLower.split(term).length - 1;
            score += bodyMatches;
            });

            return {
            id: doc.id,
            title: doc.title,
            body: doc.body,
            score
            };
        });

        // Sort by score desc
        scored.sort((a, b) => b.score - a.score);

        // Take top 3 with score > 0
        const top3 = scored
            .filter(s => s.score > 0)
            .slice(0, 3)
            .map(s => ({
            id: s.id,
            title: s.title,
            excerpt: s.body.substring(0, 150) + '...',
            score: s.score
            }));

        // If ticketId provided, save matches
        if (ticketId && top3.length > 0) {
            // Delete old matches first (if re-running)
            await prisma.ticketKBMatch.deleteMany({ where: { ticket_id: ticketId } });
            
            for (const match of top3) {
                await prisma.ticketKBMatch.create({
                    data: {
                        ticket_id: ticketId,
                        kb_document_id: match.id,
                        score: match.score,
                        title_snapshot: match.title,
                        excerpt_snapshot: match.excerpt
                    }
                });
            }
        }

        if (ticketId) {
             await logRun({
                ticketId,
                step: 'rag_search',
                status: 'success',
                startedAt,
                finishedAt: new Date(),
                payload: { count: top3.length },
            });
        }
       
        return top3;

      } catch (e: any) {
          if (attempts === maxRetries) {
               if (ticketId) {
                    await logRun({
                        ticketId,
                        step: 'rag_search',
                        status: 'failed',
                        startedAt,
                        finishedAt: new Date(),
                        errorMessage: e.message,
                    });
                }
              throw e;
          }
           await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts - 1)));
      }
  }
  return [];
}
