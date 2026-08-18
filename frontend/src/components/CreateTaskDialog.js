import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TASK_STATUSES, PRIORITIES } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CreateTaskDialog({ open, onOpenChange, onCreated, defaultProjectId }) {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", priority: "Medium", status: "To Do", project_id: "", assignee_id: "", service_id: "", due_date: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      api.get("/projects").then((r) => setProjects(r.data)).catch(() => {});
      api.get("/users").then((r) => setUsers(r.data)).catch(() => {});
      api.get("/services").then((r) => setServices(r.data)).catch(() => {});
      setForm((f) => ({ ...f, project_id: defaultProjectId || "" }));
    }
  }, [open, defaultProjectId]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.project_id) { toast.error("Title and project are required"); return; }
    const project = projects.find((p) => p.id === form.project_id);
    setSaving(true);
    try {
      await api.post("/tasks", {
        title: form.title, description: form.description, priority: form.priority, status: form.status,
        project_id: form.project_id, client_id: project?.client_id,
        assignee_id: form.assignee_id || null, service_id: form.service_id || project?.service_id || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      });
      toast.success("Task created");
      onOpenChange(false);
      setForm({ title: "", description: "", priority: "Medium", status: "To Do", project_id: "", assignee_id: "", service_id: "", due_date: "" });
      onCreated?.();
    } catch (e) { toast.error("Failed to create task"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="create-task-dialog">
        <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Hero Key Visual" data-testid="task-title-input" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description")(e.target.value)} placeholder="Describe the work…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Project</Label>
              <Select value={form.project_id} onValueChange={set("project_id")}>
                <SelectTrigger data-testid="task-project-select"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assignee</Label>
              <Select value={form.assignee_id} onValueChange={set("assignee_id")}>
                <SelectTrigger data-testid="task-assignee-select"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>{users.filter((u) => u.role !== "client").map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={set("priority")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Service</Label>
              <Select value={form.service_id} onValueChange={set("service_id")}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date")(e.target.value)} data-testid="task-due-input" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} data-testid="submit-task-btn">{saving ? "Creating…" : "Create Task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
