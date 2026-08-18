import { StatusBadge, PriorityBadge, UserAvatar } from "@/components/Badges";
import { fmtDate, isOverdue } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/Common";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare } from "lucide-react";

export default function TaskTable({ tasks, onOpen, selectable, selected = [], onToggle, onToggleAll, showProject = true, showClient = true, emptyLabel = "No tasks yet" }) {
  if (!tasks?.length) {
    return <EmptyState icon={CheckSquare} title={emptyLabel} description="Tasks will appear here once created or assigned." />;
  }
  const allChecked = selectable && tasks.length > 0 && selected.length === tasks.length;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:border-b [&>th]:border-border [&>th]:bg-card/90 [&>th]:backdrop-blur-sm">
            {selectable && (
              <th className="h-10 w-10 pl-4">
                <Checkbox checked={allChecked} onCheckedChange={onToggleAll} data-testid="select-all-tasks" />
              </th>
            )}
            <th className="h-10 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Task</th>
            {showClient && <th className="h-10 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Client</th>}
            {showProject && <th className="h-10 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">Project</th>}
            <th className="h-10 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</th>
            <th className="h-10 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
            <th className="h-10 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Assignee</th>
            <th className="h-10 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Due</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t.id}
              data-testid={`task-row-${t.key}`}
              onClick={() => onOpen?.(t.id)}
              className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40"
            >
              {selectable && (
                <td className="w-10 pl-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.includes(t.id)} onCheckedChange={() => onToggle?.(t.id)} data-testid={`select-task-${t.key}`} />
                </td>
              )}
              <td className="px-3 py-2.5">
                <div className="flex flex-col">
                  <span className="font-mono text-[11px] text-muted-foreground">{t.key}</span>
                  <span className="font-medium text-foreground line-clamp-1">{t.title}</span>
                </div>
              </td>
              {showClient && <td className="px-3 hidden lg:table-cell text-muted-foreground">{t.client?.name || "—"}</td>}
              {showProject && <td className="px-3 hidden md:table-cell text-muted-foreground line-clamp-1">{t.project?.name || "—"}</td>}
              <td className="px-3"><PriorityBadge priority={t.priority} /></td>
              <td className="px-3"><StatusBadge status={t.status} /></td>
              <td className="px-3 hidden sm:table-cell">{t.assignee ? <UserAvatar user={t.assignee} size="sm" /> : <span className="text-xs text-muted-foreground">Unassigned</span>}</td>
              <td className={cn("px-3 font-mono text-xs", isOverdue(t.due_date, t.status) ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                {fmtDate(t.due_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
