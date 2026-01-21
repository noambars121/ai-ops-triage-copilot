import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query']
});

async function main() {
  console.log('Seeding database...');
  
  // Clean up
  await prisma.runLog.deleteMany();
  await prisma.ticketKBMatch.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.emailOutbox.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.kBDocument.deleteMany();

  // KB Documents
  const kbDocs = [
    {
      title: 'How to reset your password',
      body: 'To reset your password, go to Settings > Security > Password Reset. You will receive an email with a link.',
      tags: 'account, security, password',
    },
    {
      title: 'Billing Cycles Explained',
      body: 'We bill on the 1st of every month. Prorated charges apply if you upgrade mid-month.',
      tags: 'billing, subscription',
    },
    {
      title: 'API Rate Limits',
      body: 'The standard API rate limit is 100 requests per minute. Enterprise plans have 1000 rpm.',
      tags: 'technical, api, limits',
    },
    {
      title: 'Refund Policy',
      body: 'Refunds are available within 30 days of purchase. Contact support to initiate.',
      tags: 'billing, refund',
    }
  ];

  for (const doc of kbDocs) {
    await prisma.kBDocument.create({
      data: doc,
    });
  }

  console.log(`Seeded ${kbDocs.length} KB documents.`);

  // Sample Ticket
  const ticket = await prisma.ticket.create({
    data: {
      customer_email: 'alice@example.com',
      customer_name: 'Alice Smith',
      subject: 'Cannot access API',
      product_area: 'technical',
      status: 'needs_approval',
      ai_category: 'technical',
      ai_urgency: 'high',
      ai_summary: 'User reporting 429 errors despite paying for higher limits.',
      ai_confidence: 0.95,
      ai_suggested_reply: 'Hi Alice,\n\nI see you are hitting rate limits. I have checked your account and it seems you are on the Standard plan which has a 100 rpm limit. Let me know if you want to upgrade.\n\nBest,\nSupport',
      messages: {
          create: {
              sender_type: 'customer',
              message_body: 'I am getting a 429 error when calling the API. My plan should support more.',
              fingerprint: 'mock-fingerprint-123'
          }
      }
    },
  });

  console.log(`Seeded sample ticket: ${ticket.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
