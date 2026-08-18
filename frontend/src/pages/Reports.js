import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, StatCard, Loading } from "@/components/Common";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { FolderKanban, CheckSquare, CheckCircle2, AlertTriangle, Ban } from "lucide-react";

const COLORS = ["#2563EB", "#0EA5E9", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#64748B", "#EF4444"];

export default function Reports() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/reports").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <Loading />;
  const t = data.totals;

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Company-wide performance overview." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Active Projects" value={t.active_projects} icon={FolderKanban} />
        <StatCard label="Active Tasks" value={t.active_tasks} icon={CheckSquare} />
        <StatCard label="Completed" value={t.completed} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="Overdue" value={t.overdue} icon={AlertTriangle} accent="text-red-600" />
        <StatCard label="Blocked" value={t.blocked} icon={Ban} accent="text-rose-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Tasks by Status">
          <div className="p-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_status}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>{data.by_status.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Tasks by Priority">
          <div className="p-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.by_priority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name} (${e.value})`}>
                  {data.by_priority.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Tasks by Team Member">
          <div className="p-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_member} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Tasks by Service">
          <div className="p-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_service}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
