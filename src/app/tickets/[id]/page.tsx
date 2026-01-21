import { prisma } from '@/lib/db';
import TicketActions from '@/components/TicketActions';
import { notFound, redirect } from 'next/navigation';
import { BadgeAlert, CheckCircle, Clock } from 'lucide-react';
import { getSession } from '@/lib/auth';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
      redirect('/login');
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { 
        run_logs: { orderBy: { started_at: 'desc' } },
        messages: { orderBy: { created_at: 'asc' } },
        kb_matches: { orderBy: { score: 'desc' } }
    },
  });

  if (!ticket) notFound();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-900 font-semibold';
      case 'needs_approval': return 'bg-purple-200 text-purple-900 font-bold';
      case 'needs_info': return 'bg-orange-100 text-orange-900 font-bold';
      case 'replied': return 'bg-green-100 text-green-900 font-semibold';
      case 'waiting_on_customer': return 'bg-yellow-100 text-yellow-900 font-semibold';
      case 'escalated': return 'bg-red-200 text-red-900 font-semibold';
      case 'failed': return 'bg-red-300 text-red-950 font-bold';
      default: return 'bg-gray-200 text-gray-900 font-semibold';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Ticket Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(ticket.status)}`}>
              {ticket.status.replace(/_/g, ' ')}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-700 mb-6 border-b border-gray-200 pb-4">
            <span>From: <span className="font-semibold text-gray-900">{ticket.customer_name}</span> &lt;{ticket.customer_email}&gt;</span>
            <span>•</span>
            <span className="font-medium">{new Date(ticket.created_at).toLocaleString()}</span>
             {ticket.product_area && <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium">{ticket.product_area}</span>}
          </div>

          <div className="space-y-6">
              {ticket.messages.map((msg) => (
                  <div key={msg.id} className="border-l-4 border-blue-300 pl-4 py-2">
                      <div className="text-xs text-gray-700 mb-2 flex justify-between font-medium">
                          <span className="font-semibold capitalize text-gray-900">{msg.sender_type}</span>
                          <span className="text-gray-600">{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      <div className="prose max-w-none text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {msg.message_body}
                      </div>
                      {msg.attachments && (
                        <div className="mt-3 text-sm">
                            <span className="text-gray-700 font-medium">📎 Attachment: </span>
                            <a href={msg.attachments} className="text-blue-700 hover:text-blue-900 font-semibold hover:underline" target="_blank">{msg.attachments}</a>
                        </div>
                      )}
                  </div>
              ))}
          </div>
        </div>

        {/* AI Action Area */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
            🤖 AI Triage Copilot
            {ticket.ai_confidence && (
                <span className="text-xs font-normal text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    Confidence: {(ticket.ai_confidence * 100).toFixed(0)}%
                </span>
            )}
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <div className="text-xs text-gray-700 uppercase font-semibold mb-1">Category</div>
              <div className="font-semibold text-gray-900">{ticket.ai_category || 'Pending...'}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <div className="text-xs text-gray-700 uppercase font-semibold mb-1">Urgency</div>
              <div className="font-semibold text-gray-900 capitalize flex items-center gap-2">
                {ticket.ai_urgency || 'Pending...'}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs text-gray-700 uppercase font-semibold mb-1">Summary</div>
            <p className="text-gray-900 bg-yellow-50 p-3 rounded border border-yellow-200">{ticket.ai_summary || 'Pending...'}</p>
          </div>

          <TicketActions ticket={ticket} />
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        
        {/* KB Matches */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold mb-4 text-gray-900">📚 Relevant Knowledge Base</h3>
            <div className="space-y-4">
                {ticket.kb_matches.map(match => (
                    <div key={match.id} className="border-b border-gray-200 pb-3 last:border-0">
                        <div className="font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer">
                            {match.title_snapshot}
                        </div>
                        <p className="text-xs text-gray-700 mt-1 line-clamp-3 leading-relaxed">
                            {match.excerpt_snapshot}
                        </p>
                    </div>
                ))}
                {ticket.kb_matches.length === 0 && <div className="text-sm text-gray-700">No matches found.</div>}
            </div>
        </div>

        {/* Run Logs */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold mb-4 text-gray-900">Run Logs</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {ticket.run_logs.map(log => (
                    <div key={log.id} className="text-sm border-b border-gray-200 pb-2 last:border-0">
                        <div className="flex justify-between">
                            <span className="font-semibold capitalize text-gray-900">{log.step.replace(/_/g, ' ')}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${log.status === 'success' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
                                {log.status}
                            </span>
                        </div>
                        <div className="text-xs text-gray-700 mt-1 font-medium">
                            {new Date(log.started_at).toLocaleTimeString()} 
                            {log.latency_ms ? ` (${log.latency_ms}ms)` : ''}
                        </div>
                        {log.error_message && (
                            <div className="text-xs text-red-700 mt-1 break-words font-medium">{log.error_message}</div>
                        )}
                    </div>
                ))}
                {ticket.run_logs.length === 0 && <div className="text-sm text-gray-700">No logs yet.</div>}
            </div>
        </div>
      </div>
    </div>
  );
}
