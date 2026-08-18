import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth, can } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { PageHeader, SectionCard, StatCard, Loading } from "@/components/Common";
import { StatusBadge, PriorityBadge, UserAvatar } from "@/components/Badges";
import TaskTable from "@/components/TaskTable";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { Button } from "@/components/ui/button";
import { fmtDate, timeAgo, isOverdue } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Briefcase, CalendarClock, AlertTriangle, Eye, Ban, CheckCircle2, Plus, Activity,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { openTask, dataVersion, bump } = useUI();
  const [data, setData] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { api.get("/dashboard").then((r) => setData(r.data)).catch(() => {}); }, [dataVersion]);

  if (!data) return <Loading />;
  const s = data.stats;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const cards = [
    { label: "Open Tasks", value: s.open, icon: Briefcase, accent: "text-foreground" },
    { label: "Due Today", value: s.due_today, icon: CalendarClock, accent: "text-sky-600" },
    { label: "Overdue", value: s.overdue, icon: AlertTriangle, accent: "text-red-600" },
    { label: "In Review", value: s.in_review, icon: Eye, accent: "text-amber-600" },
    { label: "Blocked", value: s.blocked, icon: Ban, accent: "text-rose-600" },
    { label: "Done / Week", value: s.completed_week, icon: CheckCircle2, accent: "text-emerald-600" },
  ];

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ")[0]}`}
        subtitle="Here's what's happening across your workspace."
        actions={can.manage(user) && <Button onClick={() => setCreateOpen(true)} data-testid="dashboard-create-task"><Plus className="mr-1.5 h-4 w-4" /> New Task</Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => <StatCard key={c.label} {...c} testid={`stat-${c.label.toLowerCase().replace(/[^a-z]/g, "-")}`} />)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="My Work" testid="dashboard-my-work"
            action={<span className="text-xs text-muted-foreground">{data.my_tasks.length} tasks</span>}>
            <TaskTable tasks={data.my_tasks} onOpen={openTask} emptyLabel="No tasks assigned to you" />
          </SectionCard>

          <SectionCard title="Blocked Work" testid="dashboard-blocked">
            {data.blocked.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing is blocked. </p>
            ) : (
              <div className="divide-y divide-border/60">
                {data.blocked.map((t) => (
                  <button key={t.id} onClick={() => openTask(t.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/40">
                    <Ban className="h-4 w-4 text-rose-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.blocked_reason || "Blocked"} · {t.client?.name}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Upcoming Deadlines" testid="dashboard-upcoming">
            {data.upcoming.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No upcoming deadlines.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {data.upcoming.map((t) => (
                  <button key={t.id} onClick={() => openTask(t.id)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.project?.name}</p>
                    </div>
                    <span className={cn("font-mono text-xs", isOverdue(t.due_date, t.status) ? "text-red-600 font-semibold" : "text-muted-foreground")}>{fmtDate(t.due_date)}</span>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Recent Activity" testid="dashboard-activity">
            <div className="space-y-3 p-5">
              {data.activities.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
              {data.activities.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 text-sm">
                  <UserAvatar user={a.actor} size="sm" />
                  <div className="min-w-0">
                    <p className="leading-snug"><span className="font-medium">{a.actor?.name}</span> <span className="text-muted-foreground">{a.action}</span></p>
                    <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {can.manage(user) && data.team?.length > 0 && (
            <SectionCard title="Team Overview" testid="dashboard-team">
              <div className="divide-y divide-border/60">
                {data.team.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                    <UserAvatar user={m} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.active_tasks} active · {m.overdue_tasks} overdue</p>
                    </div>
                    <span className={cn("h-2 w-2 rounded-full", m.workload === "high" ? "bg-red-500" : m.workload === "medium" ? "bg-amber-500" : "bg-emerald-500")} title={`${m.workload} workload`} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={bump} />
    </div>
  );
}
