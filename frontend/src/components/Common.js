import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, action, children, className, testid }) {
  return (
    <div data-testid={testid} className={cn("surface overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "text-foreground", onClick, testid }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className="surface surface-hover group flex flex-col items-start p-4 text-left"
    >
      <div className="flex w-full items-center justify-between">
        <span className="tiny-label">{label}</span>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-brand ring-1 ring-inset ring-brand/10 transition-transform duration-200 group-hover:scale-105">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
      </div>
      <span className={cn("mt-3 font-mono text-3xl font-semibold tabular-nums tracking-tight", accent)}>{value}</span>
    </button>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40">
          <Icon className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
        </div>
      )}
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="ml-2 text-sm">{label}…</span>
    </div>
  );
}
