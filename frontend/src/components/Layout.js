import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/constants";
import { UserAvatar } from "@/components/Badges";
import GlobalSearch from "@/components/GlobalSearch";
import { cn } from "@/lib/utils";
import { Search, Bell, Menu, X, LogOut, Command, Sun, Moon, ChevronsUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

const NAV_GROUPS = [
  { label: "", keys: ["home", "my-work", "tasks"] },
  { label: "Workspace", keys: ["projects", "clients", "team", "calendar"] },
  { label: "Insights", keys: ["files", "notifications", "reports", "services"] },
  { label: "", keys: ["settings"] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [dark, setDark] = useState(false);

  const items = NAV_ITEMS.filter((n) => n.roles.includes(user?.role));
  const itemMap = Object.fromEntries(items.map((i) => [i.key, i]));

  useEffect(() => {
    const loadUnread = () => api.get("/notifications").then((r) => setUnread(r.data.filter((n) => !n.read).length)).catch(() => {});
    loadUnread();
    const i = setInterval(loadUnread, 20000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleDark = () => {
    setDark((d) => { const nd = !d; document.documentElement.classList.toggle("dark", nd); return nd; });
  };

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 px-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-display text-xs font-bold text-white shadow-[0_1px_2px_rgba(0,0,0,0.25)]">UV</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold leading-tight tracking-tight">Unlock Velocity</p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">Studio Workspace</p>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mx-3 h-px bg-border" />
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((g, gi) => {
          const groupItems = g.keys.map((k) => itemMap[k]).filter(Boolean);
          if (!groupItems.length) return null;
          return (
            <div key={gi} className={gi === 0 ? "" : "mt-5"}>
              {g.label && <p className="tiny-label px-3 pb-1.5">{g.label}</p>}
              <div className="space-y-0.5">
                {groupItems.map((it) => (
                  <NavLink
                    key={it.key}
                    to={it.path}
                    end={it.path === "/"}
                    onClick={() => setMobileOpen(false)}
                    data-testid={`sidebar-nav-${it.key}`}
                    className={({ isActive }) => cn(
                      "group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                      isActive
                        ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03),_0_0_0_1px_rgba(0,0,0,0.06)] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r before:bg-brand"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <it.icon className={cn("h-[18px] w-[18px] transition-colors", "group-hover:text-foreground")} strokeWidth={1.75} />
                    <span className="flex-1">{it.label}</span>
                    {it.key === "notifications" && unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">{unread}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-card/60" data-testid="user-menu-trigger">
              <UserAvatar user={user} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user?.role]}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>Profile settings</DropdownMenuItem>
            <DropdownMenuItem onClick={toggleDark}>{dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}{dark ? "Light mode" : "Dark mode"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }} className="text-red-600" data-testid="logout-btn">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:block">{SidebarInner}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-sidebar animate-fade-in">{SidebarInner}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
          <button className="md:hidden" onClick={() => setMobileOpen(true)} data-testid="mobile-menu-btn"><Menu className="h-5 w-5" /></button>
          <button
            onClick={() => setSearchOpen(true)}
            data-testid="open-search-btn"
            className="flex h-8 max-w-md flex-1 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-all duration-150 hover:border-muted-foreground/30 hover:bg-card focus-within:ring-2 focus-within:ring-brand/20"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search everything…</span>
            <kbd className="hidden items-center gap-0.5 rounded border border-border bg-card px-1.5 text-[10px] sm:flex"><Command className="h-3 w-3" />K</kbd>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={toggleDark} className="rounded-md p-2 text-muted-foreground hover:bg-muted" data-testid="theme-toggle">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={() => navigate("/notifications")} className="relative rounded-md p-2 text-muted-foreground hover:bg-muted" data-testid="topbar-notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-[1400px] animate-fade-in">{children}</div>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
