import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth, can } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { PageHeader, SectionCard, Loading } from "@/components/Common";
import TaskTable from "@/components/TaskTable";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { StatusBadge, PriorityBadge, UserAvatar } from "@/components/Badges";
import { TASK_STATUSES, PRIORITIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, List, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function Tasks() {
  const { user } = useAuth();
  const { openTask, dataVersion, bump } = useUI();
  const [tasks, setTasks] = useState(null);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [view, setView] = useState("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [fStatus, setFStatus] = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fClient, setFClient] = useState("all");
  const [selected, setSelected] = useState([]);
  const [bulkAssignee, setBulkAssignee] = useState("");

  const load = () => api.get("/tasks").then((r) => setTasks(r.data)).catch(() => {});
  useEffect(() => { load(); }, [dataVersion]);
  useEffect(() => {
    api.get("/users").then((r) => setUsers(r.data)).catch(() => {});
    api.get("/clients").then((r) => setClients(r.data)).catch(() => {});
  }, []);

  if (!tasks) return <Loading />;

  const filtered = tasks.filter((t) =>
    (fStatus === "all" || t.status === fStatus) &&
    (fPriority === "all" || t.priority === fPriority) &&
    (fClient === "all" || t.client_id === fClient)
  );

  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = () => setSelected((s) => s.length === filtered.length ? [] : filtered.map((t) => t.id));

  const bulkAssign = async () => {
    if (!bulkAssignee || selected.length === 0) return;
    await api.post("/tasks/bulk-assign", { task_ids: selected, assignee_id: bulkAssignee });
    toast.success(`Assigned ${selected.length} tasks`);
    setSelected([]); setBulkAssignee(""); load(); bump();
  };

  const byStatus = (st) => filtered.filter((t) => t.status === st);

  return (
    <div>
      <PageHeader title="Tasks" subtitle="All work across every client and project."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border p-0.5">
              <button onClick={() => setView("list")} className={`rounded p-1.5 ${view === "list" ? "bg-muted" : ""}`} data-testid="view-list"><List className="h-4 w-4" /></button>
              <button onClick={() => setView("board")} className={`rounded p-1.5 ${view === "board" ? "bg-muted" : ""}`} data-testid="view-board"><LayoutGrid className="h-4 w-4" /></button>
            </div>
            {can.manage(user) && <Button onClick={() => setCreateOpen(true)} data-testid="create-task-btn"><Plus className="mr-1.5 h-4 w-4" /> New Task</Button>}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="h-9 w-40" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fPriority} onValueChange={setFPriority}>
          <SelectTrigger className="h-9 w-36" data-testid="filter-priority"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Priorities</SelectItem>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fClient} onValueChange={setFClient}>
          <SelectTrigger className="h-9 w-40" data-testid="filter-client"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Clients</SelectItem>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>

        {can.manage(user) && selected.length > 0 && (
          <div className="ml-auto flex items-center gap-2 rounded-md border border-brand/30 bg-brand/5 px-2 py-1" data-testid="bulk-bar">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
              <SelectTrigger className="h-8 w-40" data-testid="bulk-assignee"><SelectValue placeholder="Assign to…" /></SelectTrigger>
              <SelectContent>{users.filter((u) => u.role !== "client").map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" onClick={bulkAssign} data-testid="bulk-assign-btn"><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign</Button>
          </div>
        )}
      </div>

      {view === "list" ? (
        <SectionCard>
          <TaskTable tasks={filtered} onOpen={openTask} selectable={can.manage(user)} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
        </SectionCard>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TASK_STATUSES.map((st) => (
            <div key={st} className="w-72 shrink-0" data-testid={`board-col-${st.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="mb-2 flex items-center justify-between">
                <StatusBadge status={st} />
                <span className="text-xs text-muted-foreground">{byStatus(st).length}</span>
              </div>
              <div className="space-y-2">
                {byStatus(st).map((t) => (
                  <button key={t.id} onClick={() => openTask(t.id)} className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-brand/40" data-testid={`board-card-${t.key}`}>
                    <p className="font-mono text-[10px] text-muted-foreground">{t.key}</p>
                    <p className="mt-0.5 text-sm font-medium line-clamp-2">{t.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.client?.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <PriorityBadge priority={t.priority} />
                      {t.assignee && <UserAvatar user={t.assignee} size="sm" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { load(); bump(); }} />
    </div>
  );
}
