import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, ROLE_HOME, type AppRole } from "@/lib/auth";
import { Scissors, Loader2, Store, User as UserIcon, Calendar, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — Fade Factory OS" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast.error("Please select a role");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, role);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Account created");
    navigate({ to: ROLE_HOME[role] });
  };

  const roles: {
    value: AppRole;
    title: string;
    desc: string;
    icon: typeof Store;
  }[] = [
    {
      value: "owner",
      title: "Shop Owner",
      desc: "Run the shop, see all metrics",
      icon: Store,
    },
    {
      value: "barber",
      title: "Barber",
      desc: "Manage your daily chair",
      icon: UserIcon,
    },
    {
      value: "customer",
      title: "Customer",
      desc: "Book your next cut",
      icon: Calendar,
    },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8"
        style={{ boxShadow: "var(--shadow-elegant)" }}
      >
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Scissors className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">
            Fade Factory <span className="text-primary">OS</span>
          </span>
        </Link>
        <h1 className="font-display text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Pick your role to get started.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="mb-2 block">I am a…</Label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => {
                const active = role === r.value;
                const Icon = r.icon;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "relative rounded-lg border p-3 text-left transition-all",
                      "hover:border-primary/60 hover:bg-primary/5",
                      active
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border/60 bg-card"
                    )}
                  >
                    {active && (
                      <span
                        className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center"
                        style={{ background: "var(--gradient-gold)" }}
                      >
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </span>
                    )}
                    <Icon
                      className={cn(
                        "h-5 w-5 mb-1.5",
                        active ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div className="font-display text-xs font-semibold">{r.title}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {r.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !role}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>

        <p className="mt-6 text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}