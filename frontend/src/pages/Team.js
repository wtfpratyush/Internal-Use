import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, Loading } from "@/components/Common";
import { UserAvatar } from "@/components/Badges";
import { ROLE_LABELS } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function Team() {
  const [team, setTeam] = useState(null);
  useEffect(() => { api.get("/team").then((r) => setTeam(r.data)).catch(() => {}); }, []);
  if (!team) return <Loading />;

  const workColor = { high: "text-red-600", medium: "text-amber-600", low: "text-emerald-600" };

  return (
    <div>
      <PageHeader title="Team" subtitle="Workload and availability across the team." />
      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left">
              {["Member", "Role", "Department", "Active", "Completed", "Overdue", "Workload"].map((h) => <th key={h} className="h-10 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{h}</th>)}
            </tr></thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id} className="border-b border-border/60 hover:bg-muted/40" data-testid={`team-row-${m.id}`}>
                  <td className="px-4 py-3"><div className="flex items-center gap-2.5"><UserAvatar user={m} size="md" /><div><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.title}</p></div></div></td>
                  <td className="px-4 text-muted-foreground">{ROLE_LABELS[m.role]}</td>
                  <td className="px-4 text-muted-foreground">{m.department || "—"}</td>
                  <td className="px-4 font-mono">{m.active_tasks}</td>
                  <td className="px-4 font-mono">{m.completed_tasks}</td>
                  <td className={cn("px-4 font-mono", m.overdue_tasks > 0 && "text-red-600 font-semibold")}>{m.overdue_tasks}</td>
                  <td className="px-4">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(m.active_tasks * 20, 100)} className="h-1.5 w-20" />
                      <span className={cn("text-xs font-medium capitalize", workColor[m.workload])}>{m.workload}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
