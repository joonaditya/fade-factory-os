import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Scissors, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — Fade Factory OS" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    const trimmedPhone = phone.trim();
    if (trimmedPhone.length < 6) {
      setPhoneError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, "customer", trimmedPhone);
    setLoading(false);
    if (error) {
      if (error.toLowerCase().includes("phone")) {
        setPhoneError(error);
      } else {
        toast.error(error);
      }
      return;
    }
    toast.success("Account created");
    navigate({ to: "/" });
  };

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
          Sign up to book your next cut.
        </p>

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
            />
          </div>
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              type="tel"
              required
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
              className={`mt-1.5 ${phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              maxLength={20}
            />
            {phoneError ? (
              <p className="text-xs text-destructive mt-1">{phoneError}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Used to confirm your bookings.
              </p>
            )}
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
          <Button type="submit" className="w-full" disabled={loading}>
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
