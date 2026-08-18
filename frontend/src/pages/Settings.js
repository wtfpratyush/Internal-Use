import { useState } from "react";
import { useAuth, can } from "@/context/AuthContext";
import { PageHeader, SectionCard } from "@/components/Common";
import { UserAvatar } from "@/components/Badges";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "team_member", department: "", title: "" });

  const createUser = async () => {
    if (!form.name || !form.email) { toast.error("Name and email required"); return; }
    try {
      await api.post("/users", form);
      toast.success("User created (password: admin123)"); setOpen(false);
      setForm({ name: "", email: "", role: "team_member", department: "", title: "" });
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile and workspace." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Profile">
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <UserAvatar user={user} size="lg" />
              <div><p className="font-semibold">{user?.name}</p><p className="text-sm text-muted-foreground">{ROLE_LABELS[user?.role]}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">Name</Label><Input defaultValue={user?.name} disabled /></div>
              <div><Label className="text-xs">Email</Label><Input defaultValue={user?.email} disabled /></div>
              <div><Label className="text-xs">Department</Label><Input defaultValue={user?.department} disabled /></div>
              <div><Label className="text-xs">Title</Label><Input defaultValue={user?.title} disabled /></div>
            </div>
          </div>
        </SectionCard>

        {can.manage(user) && (
          <SectionCard title="Team Management" action={<Button size="sm" onClick={() => setOpen(true)} data-testid="settings-add-user"><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add User</Button>}>
            <div className="p-5 text-sm text-muted-foreground">
              As {ROLE_LABELS[user?.role]}, you can create new team members, admins{can.superAdmin(user) ? ", and manage all workspace settings" : ""}. New users get the default password <span className="font-mono">admin123</span>.
            </div>
          </SectionCard>
        )}

        <SectionCard title="Notification Preferences">
          <div className="space-y-3 p-5">
            {["Task assignments", "Mentions & comments", "Deadline reminders", "Review requests", "Client feedback"].map((l) => (
              <label key={l} className="flex items-center justify-between text-sm">
                {l}<input type="checkbox" defaultChecked className="h-4 w-4 accent-brand" />
              </label>
            ))}
          </div>
        </SectionCard>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="add-user-dialog">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-name-input" /></div>
              <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-email-input" /></div>
              <div><Label className="text-xs">Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="user-role-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  {can.superAdmin(user) && <SelectItem value="admin">Admin</SelectItem>}
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={createUser} data-testid="submit-user-btn">Create User</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
