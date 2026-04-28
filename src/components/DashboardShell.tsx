import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import {
  Scissors,
  LayoutDashboard,
  Users,
  LogOut,
  Loader2,
  Calendar,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (profile) {
      // Customers don't belong here
      if (profile.role === "customer") {
        navigate({ to: "/booking" });
        return;
      }
      // Barbers can't see owner dashboard
      if (profile.role === "barber" && path === "/dashboard") {
        navigate({ to: "/barber" });
      }
    }
  }, [loading, user, profile, navigate, path]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const role = profile?.role ?? "barber";

  const navItems =
    role === "owner"
      ? [
          { to: "/dashboard", label: "Owner Dashboard", icon: LayoutDashboard },
          { to: "/barber", label: "Barber Dashboard", icon: Users },
        ]
      : role === "barber"
        ? [{ to: "/barber", label: "My Schedule", icon: Calendar }]
        : [{ to: "/booking", label: "Book a Cut", icon: Calendar }];

  const roleLabel: Record<string, string> = {
    owner: "Shop Owner",
    barber: "Barber",
    customer: "Customer",
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border hover:bg-sidebar-accent/30 transition-colors"
        >
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Scissors className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-bold text-sidebar-foreground">
              Fade Factory
            </span>
            <span className="text-[10px] uppercase tracking-widest text-primary">
              OS
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((n) => {
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
                {n.label}
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-sidebar-border/60">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
            >
              <Home className="h-4 w-4" />
              Back to site
            </Link>
          </div>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: "var(--gradient-gold)",
                color: "var(--primary-foreground)",
              }}
            >
              {(user.email ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sidebar-foreground/80 truncate">
                {user.email}
              </p>
              <p className="text-[10px] text-primary capitalize">
                {roleLabel[role] ?? role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 text-xs"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
