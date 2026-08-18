import {
  Home, Briefcase, CheckSquare, FolderKanban, Users, Building2,
  Calendar, Files, Bell, BarChart3, Layers, Settings,
} from "lucide-react";

export const TASK_STATUSES = [
  "To Do", "Brief", "In Progress", "In Review", "Changes Requested", "Approved", "Completed", "Blocked",
];

export const PROJECT_STATUSES = [
  "Not Started", "Planning", "In Progress", "In Review", "Waiting for Client", "Blocked", "Completed", "Archived",
];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export const STATUS_STYLES = {
  "To Do": { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  "Brief": { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  "In Progress": { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  "In Review": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  "Changes Requested": { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  "Approved": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "Completed": { bg: "bg-zinc-100", text: "text-zinc-700", dot: "bg-zinc-500" },
  "Blocked": { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-600" },
  // project statuses fallback
  "Not Started": { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  "Planning": { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  "Waiting for Client": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  "Archived": { bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" },
};

export const PRIORITY_STYLES = {
  Low: { text: "text-slate-400", bg: "bg-slate-100", label: "Low" },
  Medium: { text: "text-sky-600", bg: "bg-sky-50", label: "Medium" },
  High: { text: "text-amber-600", bg: "bg-amber-50", label: "High" },
  Urgent: { text: "text-red-600", bg: "bg-red-50", label: "Urgent" },
};

export const NAV_ITEMS = [
  { key: "home", label: "Home", icon: Home, path: "/", roles: ["super_admin", "admin", "team_member", "client"] },
  { key: "my-work", label: "My Work", icon: Briefcase, path: "/my-work", roles: ["super_admin", "admin", "team_member"] },
  { key: "tasks", label: "Tasks", icon: CheckSquare, path: "/tasks", roles: ["super_admin", "admin", "team_member", "client"] },
  { key: "projects", label: "Projects", icon: FolderKanban, path: "/projects", roles: ["super_admin", "admin", "team_member", "client"] },
  { key: "clients", label: "Clients", icon: Building2, path: "/clients", roles: ["super_admin", "admin", "team_member"] },
  { key: "team", label: "Team", icon: Users, path: "/team", roles: ["super_admin", "admin"] },
  { key: "calendar", label: "Calendar", icon: Calendar, path: "/calendar", roles: ["super_admin", "admin", "team_member"] },
  { key: "files", label: "Files", icon: Files, path: "/files", roles: ["super_admin", "admin", "team_member", "client"] },
  { key: "notifications", label: "Notifications", icon: Bell, path: "/notifications", roles: ["super_admin", "admin", "team_member", "client"] },
  { key: "reports", label: "Reports", icon: BarChart3, path: "/reports", roles: ["super_admin", "admin"] },
  { key: "services", label: "Services", icon: Layers, path: "/services", roles: ["super_admin", "admin", "team_member"] },
  { key: "settings", label: "Settings", icon: Settings, path: "/settings", roles: ["super_admin", "admin", "team_member", "client"] },
];

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  team_member: "Team Member",
  client: "Client",
};

export function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return "—"; }
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return "—"; }
}

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function isOverdue(iso, status) {
  if (!iso || ["Completed", "Approved"].includes(status)) return false;
  return new Date(iso).getTime() < Date.now();
}
