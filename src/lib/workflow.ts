import { prisma } from './db';
import { analyzeTicket } from './llm';
import { searchKB } from './rag';
import { logRun } from './logger';

export async function runTriageWorkflow(ticketId: string) {
  const startedAt = new Date();
  try {
    // 1. Fetch Ticket & First Message
    const ticket = await prisma.ticket.findUnique({ 
        where: { id: ticketId },
        include: { messages: true }
    });
    if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

    const firstMessage = ticket.messages[0];
    const messageBody = firstMessage ? firstMessage.message_body : "";

    // 2. RAG Search (Run BEFORE Triage to provide context)
    // Use subject and message for search
    const kbResults = await searchKB(ticket.subject + " " + messageBody.substring(0, 200), ticketId);
    
    // Format KB context for LLM
    const kbContext = kbResults.map(doc => 
        `Title: ${doc.title}\nExcerpt: ${doc.excerpt}\nID: ${doc.id}`
    ).join('\n\n');

    // 3. AI Triage (with KB Context)
    const analysis = await analyzeTicket(ticket.id, ticket.subject, messageBody, kbContext);
    
    // Determine status based on confidence
    let status = 'needs_approval';
    if (analysis.confidence < 0.7) {
        status = 'needs_info'; // New status for low confidence
    }

    // Update ticket with AI results
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: status,
        ai_summary: analysis.summary,
        ai_category: analysis.category,
        ai_urgency: analysis.urgency,
        ai_suggested_reply: analysis.suggested_reply,
        ai_follow_up_questions: JSON.stringify(analysis.follow_up_questions),
        ai_confidence: analysis.confidence,
        ai_token_usage: analysis.token_usage,
      },
    });

    // 4. Log Workflow Completion
    await logRun({
      ticketId,
      step: 'triage', // Overall workflow considered triage here
      status: 'success',
      startedAt,
      finishedAt: new Date(),
      payload: { workflow: 'complete', kbDocsFound: kbResults.length, confidence: analysis.confidence },
    });

  } catch (error: any) {
    console.error('Workflow failed:', error);
    
    // Update ticket status to failed
    await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'failed' }
    });

    await logRun({
      ticketId,
      step: 'triage',
      status: 'failed',
      startedAt,
      finishedAt: new Date(),
      errorMessage: error.message,
    });
  }
}
