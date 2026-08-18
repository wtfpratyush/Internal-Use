import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth, can } from "@/context/AuthContext";
import { StatusBadge, PriorityBadge, UserAvatar } from "@/components/Badges";
import { TASK_STATUSES, PRIORITIES, fmtDate, fmtDateTime, timeAgo } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  X, Send, Paperclip, CheckCircle2, MessageSquare, Activity as ActivityIcon,
  ListChecks, Upload, Loader2, FileText, Check, XCircle,
} from "lucide-react";

export default function TaskDrawer({ taskId, onClose, onMutate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [users, setUsers] = useState([]);
  const fileRef = useRef();

  const load = () => {
    if (!taskId) return;
    setLoading(true);
    api.get(`/tasks/${taskId}`).then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (taskId) { load(); api.get("/users").then((r) => setUsers(r.data)).catch(() => {}); }
    else setData(null);
    // eslint-disable-next-line
  }, [taskId]);

  if (!taskId) return null;
  const t = data?.task;

  const patch = async (payload) => {
    try {
      await api.patch(`/tasks/${taskId}`, payload);
      load(); onMutate?.();
    } catch (e) { toast.error("Update failed"); }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    const mentions = users.filter((u) => comment.includes(`@${u.name}`)).map((u) => u.id);
    await api.post(`/tasks/${taskId}/comments`, { body: comment, mentions });
    setComment(""); load(); onMutate?.();
  };

  const submitReview = async () => {
    await api.post(`/tasks/${taskId}/submit`); toast.success("Submitted for review"); load(); onMutate?.();
  };

  const doReview = async (action) => {
    await api.post(`/tasks/${taskId}/review`, { action, feedback: reviewFeedback });
    toast.success(action === "approve" ? "Approved" : "Changes requested");
    setReviewFeedback(""); load(); onMutate?.();
  };

  const onUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await api.post("/files", { name: f.name, type: f.type || "file", size: f.size, data: reader.result,
        task_id: taskId, project_id: t.project?.id, client_id: t.client?.id });
      toast.success("File uploaded"); load(); onMutate?.();
    };
    reader.readAsDataURL(f);
  };

  const toggleChecklist = (idx) => {
    const cl = [...(t.checklist || [])];
    cl[idx] = { ...cl[idx], done: !cl[idx].done };
    patch({ checklist: cl });
  };
  const toggleSubtask = (idx) => {
    const st = [...(t.subtasks || [])];
    st[idx] = { ...st[idx], done: !st[idx].done };
    patch({ subtasks: st });
  };

  const manager = can.manage(user);
  const isAssignee = t && t.assignee_id === user?.id;

  return (
    <AnimatePresence>
      {taskId && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            data-testid="task-drawer"
            className="fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl md:w-[600px] lg:w-[820px]"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {loading && !t ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : t ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border px-6 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{t.key}</span>
                      <span>·</span>
                      <span>{t.client?.name}</span>
                      <span>·</span>
                      <span className="truncate">{t.project?.name}</span>
                    </div>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{t.title}</h2>
                    <div className="mt-2 flex items-center gap-3">
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      <span className="text-xs text-muted-foreground">Due {fmtDate(t.due_date)}</span>
                    </div>
                  </div>
                  <button data-testid="close-drawer" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Action bar */}
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      {(isAssignee || manager) && t.status !== "In Review" && (
                        <Button size="sm" variant="outline" onClick={submitReview} data-testid="submit-review-btn">
                          <Send className="mr-1.5 h-3.5 w-3.5" /> Submit for Review
                        </Button>
                      )}
                      {manager && t.status === "In Review" && (
                        <>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => doReview("approve")} data-testid="approve-btn">
                            <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => doReview("request_changes")} data-testid="request-changes-btn">
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Request Changes
                          </Button>
                        </>
                      )}
                    </div>
                    {manager && t.status === "In Review" && (
                      <Textarea placeholder="Review feedback (optional)…" value={reviewFeedback} onChange={(e) => setReviewFeedback(e.target.value)} className="mb-5" data-testid="review-feedback" />
                    )}

                    <Tabs defaultValue="details">
                      <TabsList className="mb-4 bg-transparent border-b border-border rounded-none p-0 h-auto w-full justify-start gap-6">
                        {[["details", "Details", FileText], ["comments", "Comments", MessageSquare], ["files", "Files", Paperclip], ["activity", "Activity", ActivityIcon]].map(([v, l, Ic]) => (
                          <TabsTrigger key={v} value={v} data-testid={`drawer-tab-${v}`} className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-sm data-[state=active]:border-brand data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground">
                            <Ic className="mr-1.5 h-3.5 w-3.5" />{l}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      <TabsContent value="details" className="space-y-6">
                        <Field label="Description">{t.description || "No description."}</Field>
                        {t.brief && <Field label="Brief">{t.brief}</Field>}
                        {t.checklist?.length > 0 && (
                          <div>
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><ListChecks className="h-3.5 w-3.5" /> Checklist</p>
                            <div className="space-y-1.5">
                              {t.checklist.map((c, i) => (
                                <label key={c.id || i} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <Checkbox checked={c.done} onCheckedChange={() => toggleChecklist(i)} />
                                  <span className={c.done ? "line-through text-muted-foreground" : ""}>{c.text}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        {t.subtasks?.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Subtasks</p>
                            <div className="space-y-1.5">
                              {t.subtasks.map((s, i) => (
                                <label key={s.id || i} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <Checkbox checked={s.done} onCheckedChange={() => toggleSubtask(i)} />
                                  <span className={s.done ? "line-through text-muted-foreground" : ""}>{s.title}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        {t.blocked_reason && (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <span className="font-medium">Blocked:</span> {t.blocked_reason}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="comments" className="space-y-4">
                        {data.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
                        {data.comments.map((c) => (
                          <div key={c.id} className="flex gap-3" data-testid="comment-item">
                            <UserAvatar user={c.author} size="md" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{c.author?.name}</span>
                                <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                              </div>
                              <p className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap">{c.body}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                          <Textarea placeholder="Add a comment… use @ to mention" value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-[60px]" data-testid="comment-input" />
                          <Button size="icon" onClick={sendComment} data-testid="send-comment-btn"><Send className="h-4 w-4" /></Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="files" className="space-y-3">
                        <input type="file" ref={fileRef} className="hidden" onChange={onUpload} data-testid="file-input" />
                        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} data-testid="upload-file-btn">
                          <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload File
                        </Button>
                        {data.files.length === 0 && <p className="text-sm text-muted-foreground">No files attached.</p>}
                        <div className="grid grid-cols-2 gap-3">
                          {data.files.map((f) => (
                            <a key={f.id} href={`${process.env.REACT_APP_BACKEND_URL}/api/files/${f.id}`} target="_blank" rel="noreferrer"
                               className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:border-brand/40">
                              <FileText className="h-4 w-4 text-brand" />
                              <span className="truncate">{f.name}</span>
                            </a>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="activity" className="space-y-3">
                        {data.activities.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
                        {data.activities.map((a) => (
                          <div key={a.id} className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{a.actor?.name}</span>{" "}
                              <span className="text-muted-foreground">{a.action}</span>
                              <div className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Meta sidebar */}
                  <div className="hidden w-64 shrink-0 space-y-5 overflow-y-auto border-l border-border bg-muted/20 p-5 lg:block">
                    <MetaSelect label="Status" value={t.status} options={TASK_STATUSES} disabled={!manager && !isAssignee} onChange={(v) => patch({ status: v })} testid="drawer-status-select" />
                    <MetaSelect label="Priority" value={t.priority} options={PRIORITIES} disabled={!manager} onChange={(v) => patch({ priority: v })} testid="drawer-priority-select" />
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Assignee</p>
                      {manager ? (
                        <Select value={t.assignee_id || ""} onValueChange={(v) => patch({ assignee_id: v })}>
                          <SelectTrigger className="h-9" data-testid="drawer-assignee-select"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                          <SelectContent>{users.filter((u) => u.role !== "client").map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">{t.assignee ? <><UserAvatar user={t.assignee} size="sm" />{t.assignee.name}</> : "Unassigned"}</div>
                      )}
                    </div>
                    <MetaRow label="Reporter" value={t.reporter?.name} />
                    <MetaRow label="Service" value={t.service?.name} />
                    <MetaRow label="Due date" value={fmtDate(t.due_date)} />
                    <MetaRow label="Estimate" value={t.estimate_hours ? `${t.estimate_hours}h` : "—"} />
                    {t.collaborators?.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Collaborators</p>
                        <div className="flex flex-wrap gap-1.5">{t.collaborators.map((c) => <UserAvatar key={c.id} user={c} size="sm" />)}</div>
                      </div>
                    )}
                    {t.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.tags.map((tg) => <span key={tg} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">#{tg}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{children}</p>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

function MetaSelect({ label, value, options, onChange, disabled, testid }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9" data-testid={testid}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
