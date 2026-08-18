import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { PageHeader, SectionCard, Loading } from "@/components/Common";
import TaskTable from "@/components/TaskTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

export default function MyWork() {
  const { user } = useAuth();
  const { openTask, dataVersion } = useUI();
  const [tasks, setTasks] = useState(null);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    api.get(`/tasks?assignee_id=${user.id}`).then((r) => setTasks(r.data)).catch(() => {});
  }, [user.id, dataVersion]);

  if (!tasks) return <Loading />;

  const filters = {
    all: () => tasks,
    today: () => tasks.filter((t) => (t.due_date || "").slice(0, 10) === today() && !["Completed", "Approved"].includes(t.status)),
    upcoming: () => tasks.filter((t) => t.due_date > now() && !["Completed", "Approved"].includes(t.status)),
    overdue: () => tasks.filter((t) => t.due_date && t.due_date < now() && !["Completed", "Approved"].includes(t.status)),
    review: () => tasks.filter((t) => t.status === "In Review"),
    blocked: () => tasks.filter((t) => t.status === "Blocked"),
    completed: () => tasks.filter((t) => ["Completed", "Approved"].includes(t.status)),
  };

  const tabs = [
    ["all", "Assigned to Me"], ["today", "Due Today"], ["upcoming", "Upcoming"],
    ["overdue", "Overdue"], ["review", "In Review"], ["blocked", "Blocked"], ["completed", "Completed"],
  ];

  return (
    <div>
      <PageHeader title="My Work" subtitle="Everything assigned to you, organized." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex w-full flex-wrap justify-start gap-1 bg-transparent p-0 h-auto">
          {tabs.map(([v, l]) => {
            const count = filters[v]().length;
            return (
              <TabsTrigger key={v} value={v} data-testid={`mywork-tab-${v}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm data-[state=active]:bg-brand data-[state=active]:text-white data-[state=active]:border-brand">
                {l} <span className="ml-1.5 opacity-70">{count}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <SectionCard>
        <TaskTable tasks={filters[tab]()} onOpen={openTask} emptyLabel="Nothing here — you're all caught up" />
      </SectionCard>
    </div>
  );
}
