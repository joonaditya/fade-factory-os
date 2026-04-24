import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Scissors, Calendar, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/booking")({
  head: () => ({ meta: [{ title: "Book a cut — Fade Factory OS" }] }),
  component: BookingPage,
});

function BookingPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>

        <div
          className="rounded-2xl border border-border/60 bg-card p-10 text-center"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <div
            className="h-12 w-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Calendar className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Book Your Cut</h1>
          <p className="text-muted-foreground mb-1">Welcome, {user.email}</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Customer booking flow coming soon. Pick a barber, time, and service —
            all powered by the AI receptionist.
          </p>
        </div>
      </div>
    </div>
  );
}