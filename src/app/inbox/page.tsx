import { prisma } from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BadgeAlert, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function checkAuth() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await checkAuth();
  const params = await searchParams;
  const statusFilter = params.status || 'needs_approval';
  
  const where = statusFilter !== 'all' ? { status: statusFilter } : {};
  
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: { messages: { take: 1, orderBy: { created_at: 'asc' } } }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-900 font-semibold';
      case 'needs_approval': return 'bg-purple-200 text-purple-900 font-bold';
      case 'replied': return 'bg-green-100 text-green-900 font-semibold';
      case 'waiting_on_customer': return 'bg-yellow-100 text-yellow-900 font-semibold';
      case 'escalated': return 'bg-red-200 text-red-900 font-semibold';
      case 'failed': return 'bg-red-300 text-red-950 font-bold';
      default: return 'bg-gray-200 text-gray-900 font-semibold';
    }
  };

  const getUrgencyIcon = (urgency?: string | null) => {
    if (urgency === 'high') return <BadgeAlert className="h-4 w-4 text-red-600" />;
    if (urgency === 'medium') return <Clock className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ops Inbox</h1>
        <div className="flex gap-2 text-sm">
          {['needs_approval', 'replied', 'waiting_on_customer', 'escalated', 'failed', 'all'].map((s) => (
            <Link
              key={s}
              href={`/inbox?status=${s}`}
              className={`px-3 py-1.5 rounded-full capitalize font-medium transition-colors ${
                statusFilter === s 
                  ? 'bg-black text-white font-semibold' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:text-gray-900'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="p-4 font-semibold text-gray-900">Subject</th>
              <th className="p-4 font-semibold text-gray-900">Customer</th>
              <th className="p-4 font-semibold text-gray-900">Status</th>
              <th className="p-4 font-semibold text-gray-900">Triage</th>
              <th className="p-4 font-semibold text-gray-900">Created</th>
              <th className="p-4 font-semibold text-gray-900"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-blue-50 transition-colors">
                <td className="p-4">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {ticket.subject}
                    {ticket.status === 'failed' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                  </div>
                  <div className="text-gray-700 truncate max-w-xs mt-1 text-xs">
                    {ticket.messages[0]?.message_body.substring(0, 50)}...
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-gray-900">{ticket.customer_name}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{ticket.customer_email}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {ticket.ai_category && (
                      <span className="px-2 py-0.5 border border-gray-300 rounded text-xs bg-white text-gray-800 font-medium">
                        {ticket.ai_category}
                      </span>
                    )}
                    {getUrgencyIcon(ticket.ai_urgency)}
                  </div>
                </td>
                <td className="p-4 text-gray-700 font-medium">
                  {new Date(ticket.created_at).toLocaleDateString()} {new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="p-4 text-right">
                  <Link href={`/tickets/${ticket.id}`} className="text-blue-700 hover:text-blue-900 font-semibold hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-700 font-medium">
                  No tickets found in this queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
