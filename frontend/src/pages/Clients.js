import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth, can } from "@/context/AuthContext";
import { PageHeader, EmptyState, Loading } from "@/components/Common";
import { UserAvatar } from "@/components/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("active");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", logo: "🏢" });

  const load = () => api.get("/clients").then((r) => setClients(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    await api.post("/clients", form); toast.success("Client created"); setOpen(false); setForm({ name: "", industry: "", logo: "🏢" }); load();
  };

  if (!clients) return <Loading />;
  const filtered = clients.filter((c) => c.status === tab && c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Clients" subtitle="Every client account in one place."
        actions={can.manage(user) && <Button onClick={() => setOpen(true)} data-testid="create-client-btn"><Plus className="mr-1.5 h-4 w-4" /> New Client</Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" className="pl-8" data-testid="client-search" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active" data-testid="clients-tab-active">Active</TabsTrigger>
            <TabsTrigger value="archived" data-testid="clients-tab-archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No clients found" description="Create a client to start organizing work." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => navigate(`/clients/${c.id}`)} data-testid={`client-card-${c.id}`}
              className="group flex flex-col surface surface-hover p-5 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-xl">{c.logo}</div>
                <div><h3 className="font-semibold">{c.name}</h3><p className="text-xs text-muted-foreground">{c.industry || "—"}</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="font-mono text-lg font-semibold">{c.active_projects}</p><p className="text-xs text-muted-foreground">Active projects</p></div>
                <div><p className="font-mono text-lg font-semibold">{c.open_tasks}</p><p className="text-xs text-muted-foreground">Open tasks</p></div>
              </div>
              {c.account_owner && (
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <UserAvatar user={c.account_owner} size="sm" />
                  <span className="text-xs text-muted-foreground">Owner · {c.account_owner.name}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="create-client-dialog">
          <DialogHeader><DialogTitle>Create Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="client-name-input" /></div>
            <div><Label className="text-xs">Industry</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
            <div><Label className="text-xs">Logo (emoji)</Label><Input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} data-testid="submit-client-btn">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
