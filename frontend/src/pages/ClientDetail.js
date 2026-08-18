import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useUI } from "@/context/UIContext";
import { PageHeader, SectionCard, Loading } from "@/components/Common";
import { StatusBadge } from "@/components/Badges";
import TaskTable from "@/components/TaskTable";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtDate, timeAgo } from "@/lib/constants";
import { FileText, Mail } from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openTask, dataVersion } = useUI();
  const [data, setData] = useState(null);

  useEffect(() => { api.get(`/clients/${id}`).then((r) => setData(r.data)).catch(() => {}); }, [id, dataVersion]);
  if (!data) return <Loading />;
  const c = data.client;
  const done = data.tasks.filter((t) => ["Completed", "Approved"].includes(t.status)).length;
  const progress = data.tasks.length ? Math.round(done / data.tasks.length * 100) : 0;
  const approvals = data.tasks.filter((t) => ["In Review", "Changes Requested"].includes(t.status));

  return (
    <div>
      <PageHeader title={<span className="flex items-center gap-3"><span className="text-2xl">{c.logo}</span>{c.name}</span>} subtitle={c.industry} />

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 bg-transparent border-b border-border rounded-none p-0 h-auto gap-6">
          {[["overview", "Overview"], ["projects", "Projects"], ["tasks", "Tasks"], ["approvals", "Approvals"], ["files", "Files"], ["activity", "Activity"], ["contacts", "Contacts"]].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 data-[state=active]:border-brand data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="surface p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Overall progress</p>
              <div className="mt-2 flex items-center gap-3"><Progress value={progress} className="h-2 flex-1" /><span className="font-mono font-semibold">{progress}%</span></div></div>
            <div className="surface p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Active projects</p><p className="mt-2 font-mono text-2xl font-semibold">{data.projects.filter((p) => !["Completed", "Archived"].includes(p.status)).length}</p></div>
            <div className="surface p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Open tasks</p><p className="mt-2 font-mono text-2xl font-semibold">{data.tasks.filter((t) => !["Completed", "Approved"].includes(t.status)).length}</p></div>
          </div>
          <SectionCard title="Recent Activity" className="mt-6">
            <div className="space-y-3 p-5">
              {data.activities.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              {data.activities.map((a) => <div key={a.id} className="flex items-start gap-2.5 text-sm"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" /><div><p className="text-muted-foreground">{a.action}</p><p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p></div></div>)}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="projects">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.projects.map((p) => (
              <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="surface surface-hover p-5 text-left">
                <div className="flex items-center justify-between"><h3 className="font-semibold">{p.name}</h3><StatusBadge status={p.status} /></div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">Due {fmtDate(p.due_date)}</p>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks"><SectionCard><TaskTable tasks={data.tasks} onOpen={openTask} showClient={false} /></SectionCard></TabsContent>
        <TabsContent value="approvals"><SectionCard><TaskTable tasks={approvals} onOpen={openTask} showClient={false} emptyLabel="Nothing awaiting approval" /></SectionCard></TabsContent>

        <TabsContent value="files">
          <SectionCard>
            {data.files.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">No files.</p> : (
              <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
                {data.files.map((f) => <a key={f.id} href={`${process.env.REACT_APP_BACKEND_URL}/api/files/${f.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-brand/40"><FileText className="h-4 w-4 text-brand" /><span className="truncate">{f.name}</span></a>)}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="activity">
          <SectionCard><div className="space-y-3 p-5">{data.activities.map((a) => <div key={a.id} className="flex items-start gap-2.5 text-sm"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" /><div><p className="text-muted-foreground">{a.action}</p><p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p></div></div>)}</div></SectionCard>
        </TabsContent>

        <TabsContent value="contacts">
          <SectionCard>
            <div className="divide-y divide-border/60">
              {(c.contacts || []).map((ct, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div><p className="text-sm font-medium">{ct.name}</p><p className="text-xs text-muted-foreground">{ct.role}</p></div>
                  <a href={`mailto:${ct.email}`} className="flex items-center gap-1.5 text-sm text-brand"><Mail className="h-4 w-4" />{ct.email}</a>
                </div>
              ))}
              {(!c.contacts || c.contacts.length === 0) && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No contacts.</p>}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
