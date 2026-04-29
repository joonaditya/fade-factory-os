import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  DollarSign,
  Star,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/barber")({
  head: () => ({ meta: [{ title: "Barber Dashboard — Fade Factory OS" }] }),
  component: () => (
    <DashboardShell>
      <BarberDashboard />
    </DashboardShell>
  ),
});

type Barber = { barber_id: string; name: string; rating?: number | null };
type Customer = { id: string; name?: string | null; full_name?: string | null };
type Service = { service_id: string; name: string; price: number | null };
type Appointment = {
  appt_id: string;
  customer_id: string | null;
  barber_id: string | null;
  service_id: string | null;
  appt_datetime: string;
  end_datetime: string | null;
  status: string | null;
  price: number | null;
};

const STATUSES = ["confirmed", "completed", "no-show"] as const;

function BarberDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isOwner = profile?.role === "owner";

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [services, setServices] = useState<Record<string, Service>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Redirect customers away
  useEffect(() => {
    if (profile?.role === "customer") navigate({ to: "/booking" });
  }, [profile, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("barbers").select("*").order("name");
      const list = (data ?? []) as Barber[];
      setBarbers(list);

      if (profile?.role === "barber" && user) {
        // Try to find this barber's own record via user_id
        const { data: mine } = await supabase
          .from("barbers")
          .select("barber_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (mine?.barber_id) {
          setSelected(mine.barber_id);
          return;
        }
      }
      // Owner or unlinked barber: default to first
      if (list.length > 0) setSelected(list[0].barber_id);
    })();
  }, [profile, user]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    (async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const [apptsRes, customersRes, servicesRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, services(price)")
          .eq("barber_id", selected)
          .gte("appt_datetime", weekStart)
          .order("appt_datetime", { ascending: true }),
        supabase.from("customers").select("id,name,full_name"),
        supabase.from("services").select("service_id,name,price"),
      ]);
      setAppointments((apptsRes.data ?? []) as Appointment[]);
      const cMap: Record<string, Customer> = {};
      (customersRes.data ?? []).forEach((c: Customer) => (cMap[c.id] = c));
      setCustomers(cMap);
      const sMap: Record<string, Service> = {};
      (servicesRes.data ?? []).forEach((s: Service) => (sMap[s.service_id] = s));
      setServices(sMap);
      setLoading(false);
    })();
  }, [selected]);

  const selectedBarber = useMemo(
    () => barbers.find((b) => b.barber_id === selected),
    [barbers, selected]
  );

  const todays = useMemo(() => {
    const s = startOfDay(new Date()).toISOString();
    const e = endOfDay(new Date()).toISOString();
    return appointments.filter((a) => a.appt_datetime >= s && a.appt_datetime <= e);
  }, [appointments]);

  const stats = useMemo(() => {
    const priceFor = (a: Appointment & { services?: { price: number } | null }) =>
      Number(a.price ?? a.services?.price ?? (a.service_id ? services[a.service_id]?.price : 0) ?? 0);
    const weekRevenue = appointments
      .filter((a) => ["confirmed", "completed"].includes((a.status ?? "").toLowerCase()))
      .reduce((s, a) => s + priceFor(a), 0);
    return { todayCount: todays.length, weekRevenue };
  }, [appointments, services, todays]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase.from("appointments").update({ status }).eq("appt_id", id);
    setUpdating(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.appt_id === id ? { ...a, status } : a)));
    toast.success(`Marked as ${status}`);
  };

  return (
    <div className="p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-medium uppercase tracking-widest">Agent 7</p>
          <h1 className="font-display text-3xl font-bold">Barber Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        {isOwner ? (
          <div className="min-w-[220px]">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Select barber
            </label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a barber" />
              </SelectTrigger>
              <SelectContent>
                {barbers.map((b) => (
                  <SelectItem key={b.barber_id} value={b.barber_id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Viewing schedule for
            </p>
            <p className="font-display text-lg font-semibold text-primary">
              {barbers.find((b) => b.barber_id === selected)?.name ?? "—"}
            </p>
          </div>
        )}
      </header>

      {loading ? (
        <div className="h-60 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Appointments Today"
              value={String(stats.todayCount)}
              icon={Calendar}
              hint={selectedBarber?.name ?? ""}
            />
            <StatCard
              label="Week Revenue"
              value={`$${stats.weekRevenue.toFixed(0)}`}
              icon={DollarSign}
              hint="Confirmed + completed"
            />
            <StatCard
              label="Avg Rating"
              value={
                selectedBarber?.rating != null
                  ? Number(selectedBarber.rating).toFixed(1)
                  : "—"
              }
              icon={Star}
              hint="Out of 5"
            />
          </div>

          {/* Today's schedule */}
          <div
            className="rounded-xl border border-border/60 bg-card p-5"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <h3 className="font-display text-lg font-semibold mb-4">Today's Schedule</h3>
            {todays.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No appointments today
              </div>
            ) : (
              <div className="space-y-2">
                {todays.map((a) => {
                  const cust = a.customer_id ? customers[a.customer_id] : null;
                  const svc = a.service_id ? services[a.service_id] : null;
                  const status = (a.status ?? "confirmed").toLowerCase();
                  return (
                    <div
                      key={a.appt_id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/30 transition-colors"
                    >
                      <div className="text-center min-w-[60px]">
                        <p className="font-display text-xl font-bold">
                          {format(new Date(a.appt_datetime), "h:mm")}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {format(new Date(a.appt_datetime), "a")}
                        </p>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {cust?.full_name ?? cust?.name ?? "Walk-in"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {svc?.name ?? "Service"}
                          {svc?.price != null && (
                            <span className="ml-2 text-primary">
                              ${Number(svc.price).toFixed(0)}
                            </span>
                          )}
                        </p>
                      </div>
                      <StatusPill status={status} />
                      <div className="flex gap-1">
                        {STATUSES.map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant={status === s ? "default" : "outline"}
                            onClick={() => updateStatus(a.appt_id, s)}
                            disabled={updating === a.appt_id}
                            className="h-8 text-xs capitalize"
                          >
                            {updating === a.appt_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              s
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { icon: typeof Clock; cls: string; label: string }> = {
    confirmed: {
      icon: Clock,
      cls: "bg-primary/15 text-primary border-primary/30",
      label: "Confirmed",
    },
    completed: {
      icon: CheckCircle2,
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      label: "Completed",
    },
    "no-show": {
      icon: XCircle,
      cls: "bg-destructive/15 text-destructive border-destructive/30",
      label: "No-show",
    },
  };
  const cfg = map[status] ?? map.confirmed;
  const Icon = cfg.icon;
  return (
    <span
      className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}