import { cn } from "@/lib/utils";
import { STATUS_STYLES, PRIORITY_STYLES } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Flag } from "lucide-react";

export function StatusBadge({ status, className }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES["To Do"];
  return (
    <span
      data-testid={`status-badge-${(status || "").toLowerCase().replace(/\s+/g, "-")}`}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-black/5 whitespace-nowrap", s.bg, s.text, className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority, showLabel = true }) {
  const p = PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", p.text)}>
      <Flag className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
      {showLabel && p.label}
    </span>
  );
}

export function UserAvatar({ user, size = "sm", className }) {
  const sizes = { xs: "h-5 w-5 text-[9px]", sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm" };
  const initials = (user?.name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <Avatar className={cn(sizes[size], "border border-border shadow-sm", className)} title={user?.name}>
      {user?.avatar ? <AvatarImage src={user.avatar} alt={user?.name} /> : null}
      <AvatarFallback className="bg-brand/10 text-brand font-semibold">{initials}</AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({ users = [], max = 3 }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((u, i) => <UserAvatar key={u?.id || i} user={u} size="sm" className="ring-2 ring-white" />)}
      {extra > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
          +{extra}
        </span>
      )}
    </div>
  );
}
