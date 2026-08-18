import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth, can } from "@/context/AuthContext";
import { PageHeader, EmptyState, Loading } from "@/components/Common";
import { StatusBadge, PriorityBadge, UserAvatar, AvatarStack } from "@/components/Badges";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROJECT_STATUSES, PRIORITIES, fmtDate } from "@/lib/constants";
import { FolderKanban, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", client_id: "", service_id: "", priority: "Medium", status: "Not Started", due_date: "" });

  const load = () => api.get("/projects").then((r) => setProjects(r.data)).catch(() => {});
  useEffect(() => {
    load();
    api.get("/clients").then((r) => setClients(r.data)).catch(() => {});
    api.get("/services").then((r) => setServices(r.data)).catch(() => {});
  }, []);

  const create = async () => {
    if (!form.name || !form.client_id) { toast.error("Name and client required"); return; }
    await api.post("/projects", { ...form, due_date: form.due_date ? new Date(form.due_date).toISOString() : null });
    toast.success("Project created"); setOpen(false); load();
    setForm({ name: "", description: "", client_id: "", service_id: "", priority: "Medium", status: "Not Started", due_date: "" });
  };

  if (!projects) return <Loading />;

  return (
    <div>
      <PageHeader title="Projects" subtitle="Every project, connected to its client."
        actions={can.manage(user) && <Button onClick={() => setOpen(true)} data-testid="create-project-btn"><Plus className="mr-1.5 h-4 w-4" /> New Project</Button>} />

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" description="Create your first project to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} data-testid={`project-card-${p.id}`}
              className="group flex flex-col surface surface-hover p-5 text-left">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.client?.logo || "🏢"}</span>
                  <div>
                    <p className="text-xs text-muted-foreground">{p.client?.name}</p>
                    <h3 className="font-semibold leading-tight">{p.name}</h3>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description || "No description"}</p>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.completed_tasks}/{p.total_tasks} tasks</span>
                  <span className="font-mono">{p.progress}%</span>
                </div>
                <Progress value={p.progress} className="h-1.5" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={p.priority} />
                  {p.service && <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${p.service.color}18`, color: p.service.color }}>{p.service.name}</span>}
                </div>
                <AvatarStack users={p.members} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Due {fmtDate(p.due_date)}</p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="create-project-dialog">
          <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="project-name-input" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger data-testid="project-client-select"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Service</Label>
                <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label className="text-xs">Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} data-testid="submit-project-btn">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
