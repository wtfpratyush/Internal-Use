import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth, can } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { PageHeader, SectionCard, Loading } from "@/components/Common";
import { StatusBadge, PriorityBadge, UserAvatar, AvatarStack } from "@/components/Badges";
import TaskTable from "@/components/TaskTable";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtDate, timeAgo, TASK_STATUSES } from "@/lib/constants";
import { UserAvatar as UA } from "@/components/Badges";
import { Plus, FileText, LayoutGrid, List } from "lucide-react";

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { openTask, dataVersion, bump } = useUI();
  const [data, setData] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState("list");

  const load = useCallback(() => {
    api.get(`/projects/${id}`).then((r) => setData(r.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  if (!data) return <Loading />;
  const p = data.project;
  const byStatus = (st) => data.tasks.filter((t) => t.status === st);

  return (
    <div>
      <PageHeader
        title={p.name}
        subtitle={`${data.client?.name} · Due ${fmtDate(p.due_date)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={p.status} />
            {can.manage(user) && <Button onClick={() => setCreateOpen(true)} data-testid="project-add-task"><Plus className="mr-1.5 h-4 w-4" /> Add Task</Button>}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="surface p-4 md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Progress</p>
          <div className="mt-2 flex items-center gap-3">
            <Progress value={p.progress} className="h-2 flex-1" />
            <span className="font-mono text-lg font-semibold">{p.progress}%</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{data.tasks.filter((t)=>["Completed","Approved"].includes(t.status)).length}/{data.tasks.length} tasks complete</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
          <div className="mt-2 flex items-center gap-2">{p.owner && <><UA user={p.owner} size="md" /><span className="text-sm font-medium">{p.owner.name}</span></>}</div>
        </div>
        <div className="surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Team</p>
          <div className="mt-2"><AvatarStack users={p.members} max={5} /></div>
        </div>
      </div>

      <Tabs defaultValue="tasks">
        <div className="flex items-center justify-between">
          <TabsList className="mb-4 bg-transparent border-b border-border rounded-none p-0 h-auto gap-6">
            {[["tasks", "Tasks"], ["files", "Files"], ["activity", "Activity"], ["overview", "Overview"]].map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 data-[state=active]:border-brand data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">{l}</TabsTrigger>
            ))}
          </TabsList>
          <div className="flex rounded-md border border-border p-0.5">
            <button onClick={() => setView("list")} className={`rounded p-1.5 ${view === "list" ? "bg-muted" : ""}`}><List className="h-4 w-4" /></button>
            <button onClick={() => setView("board")} className={`rounded p-1.5 ${view === "board" ? "bg-muted" : ""}`}><LayoutGrid className="h-4 w-4" /></button>
          </div>
        </div>

        <TabsContent value="tasks">
          {view === "list" ? (
            <SectionCard><TaskTable tasks={data.tasks} onOpen={openTask} showProject={false} /></SectionCard>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {TASK_STATUSES.map((st) => (
                <div key={st} className="w-72 shrink-0">
                  <div className="mb-2 flex items-center justify-between"><StatusBadge status={st} /><span className="text-xs text-muted-foreground">{byStatus(st).length}</span></div>
                  <div className="space-y-2">
                    {byStatus(st).map((t) => (
                      <button key={t.id} onClick={() => openTask(t.id)} className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm hover:border-brand/40">
                        <p className="font-mono text-[10px] text-muted-foreground">{t.key}</p>
                        <p className="mt-0.5 text-sm font-medium line-clamp-2">{t.title}</p>
                        <div className="mt-2 flex items-center justify-between"><PriorityBadge priority={t.priority} />{t.assignee && <UserAvatar user={t.assignee} size="sm" />}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files">
          <SectionCard>
            {data.files.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">No files uploaded.</p> : (
              <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
                {data.files.map((f) => (
                  <a key={f.id} href={`${process.env.REACT_APP_BACKEND_URL}/api/files/${f.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-brand/40">
                    <FileText className="h-4 w-4 text-brand" /><span className="truncate">{f.name}</span>
                  </a>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="activity">
          <SectionCard>
            <div className="space-y-3 p-5">
              {data.activities.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              {data.activities.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 text-sm">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                  <div><p className="text-muted-foreground">{a.action}</p><p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p></div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="overview">
          <SectionCard>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <Info label="Description" value={p.description || "—"} />
              <Info label="Priority" value={<PriorityBadge priority={p.priority} />} />
              <Info label="Start date" value={fmtDate(p.start_date)} />
              <Info label="Due date" value={fmtDate(p.due_date)} />
              <Info label="Budget" value={p.budget ? `$${p.budget.toLocaleString()}` : "—"} />
              <Info label="Tags" value={(p.tags || []).map((t) => `#${t}`).join(" ") || "—"} />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} defaultProjectId={id} onCreated={() => { load(); bump(); }} />
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</p><div className="text-sm">{value}</div></div>;
}
