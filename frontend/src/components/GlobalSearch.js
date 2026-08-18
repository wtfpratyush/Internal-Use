import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useUI } from "@/context/UIContext";
import { Search, CheckSquare, FolderKanban, Building2, User, FileText } from "lucide-react";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

export default function GlobalSearch({ open, onOpenChange }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState({ clients: [], projects: [], tasks: [], users: [], files: [] });
  const navigate = useNavigate();
  const { openTask } = useUI();

  useEffect(() => {
    if (!q) { setRes({ clients: [], projects: [], tasks: [], users: [], files: [] }); return; }
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(q)}`).then((r) => setRes(r.data)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (fn) => { onOpenChange(false); setQ(""); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search tasks, projects, clients, files…" value={q} onValueChange={setQ} data-testid="global-search-input" />
      <CommandList>
        <CommandEmpty>{q ? "No results found." : "Start typing to search."}</CommandEmpty>
        {res.tasks?.length > 0 && (
          <CommandGroup heading="Tasks">
            {res.tasks.map((t) => (
              <CommandItem key={t.id} onSelect={() => go(() => openTask(t.id))} value={`task-${t.key}-${t.title}`}>
                <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground mr-2">{t.key}</span>{t.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {res.projects?.length > 0 && (
          <CommandGroup heading="Projects">
            {res.projects.map((p) => (
              <CommandItem key={p.id} onSelect={() => go(() => navigate(`/projects/${p.id}`))} value={`project-${p.name}`}>
                <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />{p.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {res.clients?.length > 0 && (
          <CommandGroup heading="Clients">
            {res.clients.map((c) => (
              <CommandItem key={c.id} onSelect={() => go(() => navigate(`/clients/${c.id}`))} value={`client-${c.name}`}>
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />{c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {res.users?.length > 0 && (
          <CommandGroup heading="People">
            {res.users.map((u) => (
              <CommandItem key={u.id} onSelect={() => go(() => navigate("/team"))} value={`user-${u.name}`}>
                <User className="mr-2 h-4 w-4 text-muted-foreground" />{u.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {res.files?.length > 0 && (
          <CommandGroup heading="Files">
            {res.files.map((f) => (
              <CommandItem key={f.id} onSelect={() => go(() => navigate("/files"))} value={`file-${f.name}`}>
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />{f.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
