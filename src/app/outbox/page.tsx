import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function checkAuth() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }
}

export default async function OutboxPage() {
  await checkAuth();
  const emails = await prisma.emailOutbox.findMany({
    orderBy: { created_at: 'desc' },
    take: 50
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Email Outbox (Mock)</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="p-3 font-semibold text-gray-900">Sent At</th>
              <th className="p-3 font-semibold text-gray-900">To</th>
              <th className="p-3 font-semibold text-gray-900">Subject</th>
              <th className="p-3 font-semibold text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-blue-50 transition-colors">
                <td className="p-3 text-gray-700 font-medium">
                  {new Date(email.created_at).toLocaleString()}
                </td>
                <td className="p-3 text-gray-900 font-medium">{email.to}</td>
                <td className="p-3 font-semibold text-gray-900">{email.subject}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs capitalize font-medium ${
                    email.status === 'sent' ? 'bg-green-100 text-green-900' : 'bg-yellow-100 text-yellow-900'
                  }`}>
                    {email.status}
                  </span>
                </td>
              </tr>
            ))}
             {emails.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-700 font-medium">
                  No emails sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
