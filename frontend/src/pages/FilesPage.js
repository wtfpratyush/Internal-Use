import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, EmptyState, Loading } from "@/components/Common";
import { UserAvatar } from "@/components/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Files as FilesIcon, Upload, FileText, Image, FileArchive, Search, Download } from "lucide-react";
import { fmtDate } from "@/lib/constants";
import { toast } from "sonner";

function fileIcon(type = "") {
  if (type.startsWith("image")) return Image;
  if (type.includes("zip")) return FileArchive;
  return FileText;
}
function sizeStr(b) { if (!b) return "—"; if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`; return `${(b / 1048576).toFixed(1)} MB`; }

export default function FilesPage() {
  const [files, setFiles] = useState(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const fileRef = useRef();

  const load = () => api.get("/files").then((r) => setFiles(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const onUpload = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await api.post("/files", { name: f.name, type: f.type || "file", size: f.size, data: reader.result });
      toast.success("File uploaded"); load();
    };
    reader.readAsDataURL(f);
  };

  if (!files) return <Loading />;
  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(q.toLowerCase()) &&
    (typeFilter === "all" || (typeFilter === "image" ? f.type?.startsWith("image") : !f.type?.startsWith("image")))
  );

  return (
    <div>
      <PageHeader title="Files" subtitle="Central asset library across all clients and projects."
        actions={<><input type="file" ref={fileRef} className="hidden" onChange={onUpload} /><Button onClick={() => fileRef.current?.click()} data-testid="files-upload-btn"><Upload className="mr-1.5 h-4 w-4" /> Upload</Button></>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…" className="pl-8" data-testid="files-search" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-40" data-testid="files-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="image">Images</SelectItem><SelectItem value="doc">Documents</SelectItem></SelectContent>
        </Select>
      </div>

      <SectionCard>
        {filtered.length === 0 ? (
          <EmptyState icon={FilesIcon} title="No files yet" description="Upload files or attach them to tasks." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left">
                {["Name", "Client", "Project", "Size", "Uploaded by", "Date", ""].map((h) => <th key={h} className="h-10 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((f) => {
                  const Ic = fileIcon(f.type);
                  return (
                    <tr key={f.id} className="border-b border-border/60 hover:bg-muted/40" data-testid={`file-row-${f.id}`}>
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><Ic className="h-4 w-4 text-brand" /><span className="font-medium">{f.name}</span></div></td>
                      <td className="px-4 text-muted-foreground">{f.client_name || "—"}</td>
                      <td className="px-4 text-muted-foreground">{f.project_name || "—"}</td>
                      <td className="px-4 font-mono text-xs text-muted-foreground">{sizeStr(f.size)}</td>
                      <td className="px-4">{f.uploader ? <div className="flex items-center gap-1.5"><UserAvatar user={f.uploader} size="xs" /><span className="text-xs">{f.uploader.name}</span></div> : "—"}</td>
                      <td className="px-4 font-mono text-xs text-muted-foreground">{fmtDate(f.created_at)}</td>
                      <td className="px-4"><a href={`${process.env.REACT_APP_BACKEND_URL}/api/files/${f.id}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand"><Download className="h-4 w-4" /></a></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
