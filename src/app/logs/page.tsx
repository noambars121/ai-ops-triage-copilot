import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function checkAuth() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }
}

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ status?: string, step?: string }> }) {
  await checkAuth();
  
  const params = await searchParams;
  const statusFilter = params.status;
  const stepFilter = params.step;

  const where: any = {};
  if (statusFilter) where.status = statusFilter;
  if (stepFilter) where.step = stepFilter;

  const logs = await prisma.runLog.findMany({
    where,
    take: 100,
    orderBy: { started_at: 'desc' },
    include: { ticket: true },
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
        <div className="flex flex-wrap gap-2">
            <FilterLink currentStatus={statusFilter} currentStep={stepFilter} label="All" />
            <FilterLink currentStatus={statusFilter} currentStep={stepFilter} status="failed" label="Failed Only" color="red" />
            <FilterLink currentStatus={statusFilter} currentStep={stepFilter} step="triage" label="Triage Step" />
            <FilterLink currentStatus={statusFilter} currentStep={stepFilter} step="rag_search" label="RAG Step" />
            <FilterLink currentStatus={statusFilter} currentStep={stepFilter} step="email_send" label="Email Step" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="p-3 font-semibold text-gray-900">Time</th>
              <th className="p-3 font-semibold text-gray-900">Step</th>
              <th className="p-3 font-semibold text-gray-900">Status</th>
              <th className="p-3 font-semibold text-gray-900">Ticket</th>
              <th className="p-3 font-semibold text-gray-900">Latency</th>
              <th className="p-3 font-semibold text-gray-900">Payload Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-blue-50 transition-colors group">
                <td className="p-3 text-gray-700 font-medium whitespace-nowrap">
                  {new Date(log.started_at).toLocaleString()}
                </td>
                <td className="p-3 font-semibold capitalize text-gray-900">
                  {log.step.replace(/_/g, ' ')}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.status === 'success' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="p-3 text-blue-700 font-semibold">
                  {log.ticket ? (
                      <a href={`/tickets/${log.ticket.id}`} className="hover:text-blue-900 hover:underline">
                          {log.ticket.subject.substring(0, 20)}...
                      </a>
                  ) : <span className="text-gray-500">-</span>}
                </td>
                <td className="p-3 text-gray-700 font-medium">
                  {log.latency_ms ? `${log.latency_ms}ms` : <span className="text-gray-500">-</span>}
                </td>
                <td className="p-3 text-gray-600 font-mono text-xs max-w-xs truncate" title={log.payload_preview || ''}>
                  {log.error_message ? (
                      <span className="text-red-600 font-bold">{log.error_message}</span>
                  ) : (
                      log.payload_preview || <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
                <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                        No logs found matching filters.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({ 
    currentStatus, 
    currentStep, 
    status, 
    step, 
    label, 
    color = 'blue' 
}: { 
    currentStatus?: string, 
    currentStep?: string, 
    status?: string, 
    step?: string, 
    label: string, 
    color?: 'blue' | 'red' 
}) {
    const isActive = (status === currentStatus) && (step === currentStep);
    
    // Construct query
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (step) query.set('step', step);
    const href = `/logs?${query.toString()}`;

    const baseClasses = "px-3 py-1 rounded text-sm font-medium transition-colors";
    const activeClasses = color === 'red' 
        ? "bg-red-100 text-red-800 border border-red-200" 
        : "bg-blue-100 text-blue-800 border border-blue-200";
    const inactiveClasses = "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent";

    return (
        <Link href={href} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {label}
        </Link>
    );
}
