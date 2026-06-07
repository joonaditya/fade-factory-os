import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, ROLE_HOME, type AppRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Scissors, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invite")({
  head: () => ({ meta: [{ title: "Accept Invite — Fade Factory OS" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) ?? "",
  }),
  component: InvitePage,
});

type InviteRecord = {
  id: string;
  token: string;
  email: string | null;
  role: AppRole;
  shop_id: string | null;
  used: boolean;
  expires_at: string;
  barber_name: string | null;
  barber_specialty: string | null;
};

function InvitePage() {
  const { token } = Route.useSearch();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalidReason("No invite token provided.");
      setLoadingInvite(false);
      return;
    }
    supabase
      .from("invites")
      .select("*")
      .eq("token", token)
      .maybeSingle()
      .then(({ data, error }) => {
        setLoadingInvite(false);
        if (error || !data) {
          setInvalidReason("Invite not found.");
          return;
        }
        if (data.used) {
          setInvalidReason("This invite has already been used.");
          return;
        }
        if (new Date(data.expires_at) < new Date()) {
          setInvalidReason("This invite has expired.");
          return;
        }
        setInvite(data as InviteRecord);
        if (data.email) setEmail(data.email);
      });
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);

    const { error, userId } = await signUp(email, password, invite.role);
    if (error) {
      toast.error(error);
      setSubmitting(false);
      return;
    }

    // Create barber record so they appear as a real barber in the system
    if (invite.role === "barber" && userId) {
      const { error: bErr } = await supabase.from("barbers").insert({
        user_id: userId,
        name: invite.barber_name ?? email.split("@")[0],
        expertise_tags: invite.barber_specialty ? [invite.barber_specialty] : [],
        shop_id: invite.shop_id ?? "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      });
      if (bErr) {
        console.error("barber insert error", bErr);
        toast.error("Account created but barber profile failed — contact your shop owner.");
      }
    }

    // Mark invite as used
    await supabase.from("invites").update({ used: true }).eq("id", invite.id);

    toast.success("Account created — welcome!");
    const dest = invite.role === "barber" ? ROLE_HOME["barber"] : "/";
    navigate({ to: dest });
  };

  const roleLabel = invite?.role === "owner" ? "Shop Owner" : "Barber";

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

        {loadingInvite ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invalidReason ? (
          <div className="text-center py-8">
            <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h2 className="font-display text-xl font-bold mb-2">Invalid Invite</h2>
            <p className="text-sm text-muted-foreground">{invalidReason}</p>
            <Link to="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
              Go to login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <span
                className="inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-3"
                style={{ background: "var(--gradient-gold)", color: "var(--primary-foreground)" }}
              >
                {roleLabel} Invite
              </span>
              <h1 className="font-display text-2xl font-bold mb-1">You've been invited</h1>
              <p className="text-sm text-muted-foreground">
                Set up your <strong>{roleLabel}</strong> account to get started.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                  readOnly={!!invite?.email}
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
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create {roleLabel} Account
              </Button>
            </form>

            <p className="mt-6 text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
