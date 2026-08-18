import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useUI } from "@/context/UIContext";
import { PageHeader, Loading } from "@/components/Common";
import { PriorityBadge } from "@/components/Badges";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isOverdue } from "@/lib/constants";

export default function CalendarPage() {
  const { openTask, dataVersion } = useUI();
  const [tasks, setTasks] = useState(null);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => { api.get("/tasks").then((r) => setTasks(r.data)).catch(() => {}); }, [dataVersion]);
  if (!tasks) return <Loading />;

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const tasksOn = (d) => tasks.filter((t) => {
    if (!t.due_date) return false;
    const dt = new Date(t.due_date);
    return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === d;
  });

  const monthName = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayD = new Date();
  const isToday = (d) => todayD.getFullYear() === year && todayD.getMonth() === month && todayD.getDate() === d;

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Deadlines, reviews, and milestones."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))} data-testid="cal-prev"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="w-40 text-center text-sm font-medium">{monthName}</span>
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))} data-testid="cal-next"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        } />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => (
            <div key={i} className={cn("min-h-24 border-b border-r border-border/60 p-1.5", i % 7 === 6 && "border-r-0")}>
              {d && (
                <>
                  <div className={cn("mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday(d) ? "bg-brand text-white font-semibold" : "text-muted-foreground")}>{d}</div>
                  <div className="space-y-1">
                    {tasksOn(d).slice(0, 3).map((t) => (
                      <button key={t.id} onClick={() => openTask(t.id)} className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]", isOverdue(t.due_date, t.status) ? "bg-red-50 text-red-700" : "bg-muted text-foreground hover:bg-brand/10")} data-testid={`cal-task-${t.key}`}>
                        {t.title}
                      </button>
                    ))}
                    {tasksOn(d).length > 3 && <p className="px-1.5 text-[10px] text-muted-foreground">+{tasksOn(d).length - 3} more</p>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
