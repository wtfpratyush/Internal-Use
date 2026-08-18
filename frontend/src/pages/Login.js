import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const DEMO = [
  { label: "Super Admin", email: "coconutwater2911@gmail.com" },
  { label: "Admin", email: "priya@studio.com" },
  { label: "Team Member", email: "rahul@studio.com" },
  { label: "Client", email: "contact@novaathletics.com" },
];

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("coconutwater2911@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(apiError(err.response?.data?.detail) || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-[#0F172A] p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-display text-sm font-bold">UV</div>
          <span className="font-display text-xl font-bold">Unlock Velocity</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight">Your company's single source of truth for work.</h1>
          <p className="mt-4 max-w-md text-slate-300">Clients, projects, tasks, files, approvals, and communication — unified in one command center.</p>
          <div className="mt-8 flex gap-6 text-sm text-slate-400">
            <div><p className="font-mono text-2xl font-semibold text-white">1</p>place for everything</div>
            <div><p className="font-mono text-2xl font-semibold text-white">4</p>role-based views</div>
            <div><p className="font-mono text-2xl font-semibold text-white">0</p>tool switching</div>
          </div>
        </div>
        <p className="text-xs text-slate-500">Internal work-management platform</p>
      </div>

      {/* Right form */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-display text-sm font-bold text-white">UV</div>
            <span className="font-display text-xl font-bold">Unlock Velocity</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@company.com" data-testid="login-email" />
            </div>
            <div>
              <Label className="text-xs">Password</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" data-testid="login-password" />
            </div>
            {error && <p className="text-sm text-red-600" data-testid="login-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Demo accounts (password: admin123)</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button key={d.email} onClick={() => { setEmail(d.email); setPassword("admin123"); }}
                  className="rounded-md border border-border px-3 py-2 text-left text-xs transition-colors hover:border-brand/50"
                  data-testid={`demo-${d.label.toLowerCase().replace(/\s/g, "-")}`}>
                  <p className="font-medium">{d.label}</p>
                  <p className="truncate text-muted-foreground">{d.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
