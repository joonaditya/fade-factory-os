import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Scissors, LayoutDashboard, Users, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Owner", icon: LayoutDashboard },
  { to: "/barber", label: "Barber", icon: Users },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

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
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <Link to="/" className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border">
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Scissors className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-bold text-sidebar-foreground">
              Fade Factory
            </span>
            <span className="text-[10px] uppercase tracking-widest text-primary">OS</span>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label} Dashboard
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}