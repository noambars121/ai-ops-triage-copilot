import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import { logRun } from './logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || 'mock-key');

const TriageSchema = z.object({
  summary: z.string().max(400), // ~60 words
  category: z.enum(["billing", "bug", "account", "feature_request", "how_to", "other"]),
  urgency: z.enum(["low", "medium", "high"]),
  suggested_reply: z.string(),
  follow_up_questions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type TriageResult = z.infer<typeof TriageSchema> & { token_usage?: string };

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function analyzeTicket(ticketId: string, subject: string, message: string, kbContext: string = ""): Promise<TriageResult> {
  const startedAt = new Date();
  let attempts = 0;
  const maxRetries = 3;

  while (attempts < maxRetries) {
    try {
      attempts++;
      
      // Check for API key (GEMINI_API_KEY preferred, fallback to OPENAI_API_KEY for backward compat if user didn't rename, or mock)
      const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

      if (!apiKey || apiKey === 'mock-key') {
        // Mock response if no key
        await wait(500);
        const mockResult: TriageResult = {
          summary: "Customer is asking about a feature.",
          category: "feature_request",
          urgency: "low",
          suggested_reply: "Thank you for reaching out. We have logged your request. Based on our documentation, this feature is currently in beta.",
          follow_up_questions: ["Can you provide a use case?", "How critical is this?"],
          confidence: 0.95,
          token_usage: "mock-usage"
        };
        
        await logRun({
          ticketId,
          step: 'triage',
          status: 'success',
          startedAt,
          finishedAt: new Date(),
          payload: mockResult
        });
        
        return mockResult;
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              summary: { type: SchemaType.STRING },
              category: { type: SchemaType.STRING, enum: ["billing", "bug", "account", "feature_request", "how_to", "other"] },
              urgency: { type: SchemaType.STRING, enum: ["low", "medium", "high"] },
              suggested_reply: { type: SchemaType.STRING },
              follow_up_questions: { 
                type: SchemaType.ARRAY, 
                items: { type: SchemaType.STRING } 
              },
              confidence: { type: SchemaType.NUMBER }
            },
            required: ["summary", "category", "urgency", "suggested_reply", "follow_up_questions", "confidence"]
          }
        }
      });

      const prompt = `
        You are a support triage assistant. Analyze the ticket.
        
        Ticket Subject: ${subject}
        Ticket Message: ${message}
        
        Relevant Knowledge Base Articles:
        ${kbContext || "None"}
        
        Instructions:
        1. Summarize the issue (max 60 words).
        2. Categorize it (billing, bug, account, feature_request, how_to, other).
        3. Determine urgency (low, medium, high).
        4. Draft a polite, helpful, and concise suggested reply. 
           CRITICAL: If the provided Knowledge Base Articles are relevant, you MUST cite them in the reply (e.g. "Sources: [Title]").
        5. Generate 2-3 follow-up questions to clarify the issue if needed.
        6. Estimate confidence score (0.0 to 1.0).
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const parsed = JSON.parse(text);
      const validated = TriageSchema.parse(parsed);
      
      const triageResult = {
        ...validated,
        token_usage: `${result.response.usageMetadata?.totalTokenCount || 0} tokens`
      };

      await logRun({
        ticketId,
        step: 'triage',
        status: 'success',
        startedAt,
        finishedAt: new Date(),
        payload: triageResult
      });

      return triageResult;

    } catch (error: any) {
      console.error(`Attempt ${attempts} failed:`, error);
      
      if (attempts === maxRetries) {
        await logRun({
          ticketId,
          step: 'triage',
          status: 'failed',
          startedAt,
          finishedAt: new Date(),
          errorCode: error.code || 'UNKNOWN',
          errorMessage: error.message,
          payload: { attempts }
        });
        throw error;
      }
      
      // Exponential backoff
      await wait(1000 * Math.pow(2, attempts - 1));
    }
  }
  
  throw new Error("Max retries reached");
}
