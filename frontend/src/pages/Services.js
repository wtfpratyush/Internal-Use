import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth, can } from "@/context/AuthContext";
import { PageHeader, SectionCard, Loading } from "@/components/Common";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Layers, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#2563EB", description: "" });

  const load = useCallback(() => {
    api.get("/services").then((r) => setServices(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    await api.post("/services", form); toast.success("Service added"); setOpen(false); setForm({ name: "", color: "#2563EB", description: "" }); load();
  };

  if (!services) return <Loading />;

  return (
    <div>
      <PageHeader title="Services" subtitle="Track work and performance by service line."
        actions={can.manage(user) && <Button onClick={() => setOpen(true)} data-testid="create-service-btn"><Plus className="mr-1.5 h-4 w-4" /> New Service</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.id} className="surface surface-hover p-5" data-testid={`service-card-${s.id}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${s.color}18` }}><Layers className="h-5 w-5" style={{ color: s.color }} /></div>
              <div><h3 className="font-semibold">{s.name}</h3><p className="text-xs text-muted-foreground">{s.description}</p></div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.active_tasks} active tasks</span>
              <span className="font-mono font-semibold" style={{ color: s.color }}>{s.completion}%</span>
            </div>
            <Progress value={s.completion} className="mt-2 h-1.5" />
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="create-service-dialog">
          <DialogHeader><DialogTitle>New Service</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="service-name-input" /></div>
            <div><Label className="text-xs">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label className="text-xs">Color</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-20 p-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} data-testid="submit-service-btn">Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
