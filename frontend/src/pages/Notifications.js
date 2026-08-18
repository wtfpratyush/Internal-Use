import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, EmptyState, Loading } from "@/components/Common";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Bell, UserPlus, AtSign, MessageSquare, Clock, CheckCircle2, XCircle, FileUp, Eye, CheckCheck } from "lucide-react";

const ICONS = {
  assignment: UserPlus, mention: AtSign, comment: MessageSquare, status: Clock,
  review: Eye, changes: XCircle, project: CheckCircle2, file: FileUp,
};

export default function Notifications() {
  const [notes, setNotes] = useState(null);
  const load = () => api.get("/notifications").then((r) => setNotes(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const markRead = async (id) => { await api.post(`/notifications/${id}/read`); load(); };
  const markAll = async () => { await api.post("/notifications/read-all"); load(); };

  if (!notes) return <Loading />;
  const unread = notes.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${unread} unread`}
        actions={unread > 0 && <Button variant="outline" onClick={markAll} data-testid="mark-all-read"><CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read</Button>} />
      <SectionCard>
        {notes.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
        ) : (
          <div className="divide-y divide-border/60">
            {notes.map((n) => {
              const Ic = ICONS[n.type] || Bell;
              return (
                <button key={n.id} onClick={() => markRead(n.id)} data-testid={`notification-${n.id}`}
                  className={cn("flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40", !n.read && "bg-brand/5")}>
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", !n.read ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground")}><Ic className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
