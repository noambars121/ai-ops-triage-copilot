import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
}

export default async function MetricsPage() {
  await checkAuth();

  // 1. Total Tickets Triaged (Automated)
  const totalTriaged = await prisma.runLog.count({
    where: { step: 'triage', status: 'success' }
  });

  // 2. Median Triage Latency
  const latencies = await prisma.runLog.findMany({
    where: { step: 'triage', status: 'success', latency_ms: { not: null } },
    select: { latency_ms: true },
    orderBy: { latency_ms: 'asc' }
  });

  let medianLatency = 0;
  if (latencies.length > 0) {
    const mid = Math.floor(latencies.length / 2);
    if (latencies.length % 2 === 0) {
      medianLatency = (latencies[mid - 1].latency_ms! + latencies[mid].latency_ms!) / 2;
    } else {
      medianLatency = latencies[mid].latency_ms!;
    }
  }

  // 3. Action Breakdown
  const approved = await prisma.auditEvent.count({ where: { action: 'approve' } });
  const escalated = await prisma.auditEvent.count({ where: { action: 'escalate' } });
  const totalActions = approved + escalated;
  
  // 4. Estimated Time Saved
  const timeSavedMinutes = totalTriaged * 4;
  const timeSavedHours = (timeSavedMinutes / 60).toFixed(1);

  // 5. Rates
  // Approval Rate: replied tickets / total tickets (approx)
  // Escalation Rate: escalated tickets / total tickets
  // We can use the audit counts for a more direct "Action" rate
  const approvalRate = totalActions > 0 ? ((approved / totalActions) * 100).toFixed(1) : "0";
  const escalationRate = totalActions > 0 ? ((escalated / totalActions) * 100).toFixed(1) : "0";


  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Impact Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MetricCard 
          title="Tickets Triaged" 
          value={totalTriaged.toString()} 
          subtitle="Fully automated analysis"
          color="blue"
        />
        <MetricCard 
          title="Median Latency" 
          value={`${medianLatency}ms`} 
          subtitle="AI processing time"
          color="purple"
        />
        <MetricCard 
          title="Time Saved" 
          value={`${timeSavedHours} hrs`} 
          subtitle="Est. 4 min per ticket"
          color="green"
        />
        <MetricCard 
          title="Escalation Rate" 
          value={`${escalationRate}%`} 
          subtitle="Tickets requiring human"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Action Breakdown</h2>
          <div className="space-y-4">
            <Bar label="Approved (Automated Reply)" value={approved} total={totalActions} color="bg-green-500" />
            <Bar label="Escalated (Human Intervention)" value={escalated} total={totalActions} color="bg-orange-500" />
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-600">
             <span>Approval Rate: <strong>{approvalRate}%</strong></span>
             <span>Escalation Rate: <strong>{escalationRate}%</strong></span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">ROI Calculation</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex justify-between border-b pb-2">
              <span>Avg. Agent Cost</span>
              <span className="font-semibold">$25 / hr</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span>Hours Saved</span>
              <span className="font-semibold">{timeSavedHours} hrs</span>
            </div>
            <div className="flex justify-between pt-2 text-lg font-bold text-green-700">
              <span>Total Savings</span>
              <span>${(parseFloat(timeSavedHours) * 25).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, color }: { title: string, value: string, subtitle: string, color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80">{title}</h3>
      <div className="text-3xl font-bold my-2">{value}</div>
      <div className="text-sm opacity-75">{subtitle}</div>
    </div>
  );
}

function Bar({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
        <span>{label}</span>
        <span>{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
