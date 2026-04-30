import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatCard } from "@/components/StatCard";
import { AvailabilityManager } from "@/components/AvailabilityManager";
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
  Activity,
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/barber")({
  head: () => ({ meta: [{ title: "Barber Dashboard — Fade Factory OS" }] }),
  component: () => (
    <DashboardShell>
      <BarberDashboard />
    </DashboardShell>
  ),
});

type Barber = { barber_id: string; name: string };
type Customer = { customer_id: string; name?: string | null };
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

const STATUSES = ["confirmed", "completed", "no_show"] as const;

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
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

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
      const monthStart = startOfMonth(new Date()).toISOString();
      const [apptsRes, customersRes, servicesRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, services(price)")
          .eq("barber_id", selected)
          .gte("appt_datetime", monthStart)
          .order("appt_datetime", { ascending: true }),
        supabase.from("customers").select("customer_id,name"),
        supabase.from("services").select("service_id,name,price"),
      ]);
      setAppointments((apptsRes.data ?? []) as Appointment[]);
      const cMap: Record<string, Customer> = {};
      (customersRes.data ?? []).forEach((c: Customer) => (cMap[c.customer_id] = c));
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

  const scheduledAppointments = useMemo(() => {
    const now = new Date();
    if (period === "today") {
      const s = startOfDay(now).toISOString();
      const e = endOfDay(now).toISOString();
      return appointments.filter((a) => a.appt_datetime >= s && a.appt_datetime <= e);
    }
    if (period === "week") {
      const s = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      return appointments.filter((a) => a.appt_datetime >= s);
    }
    const s = startOfMonth(now).toISOString();
    return appointments.filter((a) => a.appt_datetime >= s);
  }, [appointments, period]);

  const stats = useMemo(() => {
    const priceFor = (a: Appointment & { services?: { price: number } | null }) =>
      Number(a.price ?? a.services?.price ?? (a.service_id ? services[a.service_id]?.price : 0) ?? 0);

    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(new Date()).toISOString();

    const todayAppts = appointments.filter((a) => a.appt_datetime >= todayStart && a.appt_datetime <= todayEnd);
    const thisWeek = appointments.filter((a) => a.appt_datetime >= weekStart);
    const thisMonth = appointments.filter((a) => a.appt_datetime >= monthStart);

    // Today stats
    const todayCount = todayAppts.length;
    const todayCompleted = todayAppts.filter((a) =>
      ["completed"].includes((a.status ?? "").toLowerCase())
    ).length;
    const todayRevenue = todayAppts
      .filter((a) => ["confirmed", "completed"].includes((a.status ?? "").toLowerCase()))
      .reduce((s, a) => s + priceFor(a), 0);
    const todayAvgRevenue = todayAppts.length > 0 ? todayRevenue / todayAppts.length : 0;

    // Week stats
    const weekRevenue = thisWeek
      .filter((a) => ["confirmed", "completed"].includes((a.status ?? "").toLowerCase()))
      .reduce((s, a) => s + priceFor(a), 0);
    const completedThisWeek = thisWeek.filter((a) =>
      ["completed"].includes((a.status ?? "").toLowerCase())
    ).length;
    const weekAvgRevenue = thisWeek.length > 0 ? weekRevenue / thisWeek.length : 0;

    // Month stats
    const monthRevenue = thisMonth
      .filter((a) => ["confirmed", "completed"].includes((a.status ?? "").toLowerCase()))
      .reduce((s, a) => s + priceFor(a), 0);
    const completedThisMonth = thisMonth.filter((a) =>
      ["completed"].includes((a.status ?? "").toLowerCase())
    ).length;
    const monthAvgRevenue = thisMonth.length > 0 ? monthRevenue / thisMonth.length : 0;

    // No show counts
    const todayNoShows = todayAppts.filter((a) =>
      ["no-show", "no_show", "noshow", "cancelled", "canceled"].includes(
        (a.status ?? "").toLowerCase()
      )
    ).length;

    const weekNoShows = thisWeek.filter((a) =>
      ["no-show", "no_show", "noshow", "cancelled", "canceled"].includes(
        (a.status ?? "").toLowerCase()
      )
    ).length;

    const monthNoShows = thisMonth.filter((a) =>
      ["no-show", "no_show", "noshow", "cancelled", "canceled"].includes(
        (a.status ?? "").toLowerCase()
      )
    ).length;

    return {
      // Today
      todayCount,
      todayCompleted,
      todayRevenue,
      todayAvgRevenue,
      todayNoShows,
      // Week
      weekCount: thisWeek.length,
      completedThisWeek,
      weekRevenue,
      weekAvgRevenue,
      weekNoShows,
      // Month
      monthCount: thisMonth.length,
      completedThisMonth,
      monthRevenue,
      monthAvgRevenue,
      monthNoShows,
    };
  }, [appointments, services]);

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

  const periodLabels: Record<"today" | "week" | "month", string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
  };

  const appointmentCounts: Record<"today" | "week" | "month", number> = {
    today: stats.todayCount,
    week: stats.weekCount,
    month: stats.monthCount,
  };

  const completedCounts: Record<"today" | "week" | "month", number> = {
    today: stats.todayCompleted,
    week: stats.completedThisWeek,
    month: stats.completedThisMonth,
  };

  const revenues: Record<"today" | "week" | "month", number> = {
    today: stats.todayRevenue,
    week: stats.weekRevenue,
    month: stats.monthRevenue,
  };

  const avgRevenues: Record<"today" | "week" | "month", number> = {
    today: stats.todayAvgRevenue,
    week: stats.weekAvgRevenue,
    month: stats.monthAvgRevenue,
  };

  return (
    <div className="p-8 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-primary text-xs font-medium uppercase tracking-widest">Agent 7</p>
          <h1 className="font-display text-3xl font-bold">Barber Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-4 min-w-fit">
          {isOwner && (
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
          )}
          {!isOwner && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Viewing schedule for
              </p>
              <p className="font-display text-lg font-semibold text-primary">
                {barbers.find((b) => b.barber_id === selected)?.name ?? "—"}
              </p>
            </div>
          )}
          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Time period
            </label>
            <Select value={period} onValueChange={(value) => setPeriod(value as "today" | "week" | "month")}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="h-60 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label={`Appointments ${periodLabels[period]}`}
              value={String(appointmentCounts[period])}
              icon={Calendar}
              hint={selectedBarber?.name ?? ""}
            />
            <StatCard
              label={`${periodLabels[period]} Revenue`}
              value={`$${revenues[period].toFixed(0)}`}
              icon={DollarSign}
              hint="Confirmed + completed"
            />
            <StatCard
              label={`Completed ${periodLabels[period]}`}
              value={String(completedCounts[period])}
              icon={CheckCircle2}
              hint="Finished appointments"
            />
            <StatCard
              label={`Avg / Appointment`}
              value={`$${avgRevenues[period].toFixed(0)}`}
              icon={Activity}
              hint={`${periodLabels[period]} average`}
            />
          </div>

          {/* Schedule section */}
          <div
            className="rounded-xl border border-border/60 bg-card p-5"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <h3 className="font-display text-lg font-semibold mb-4">
              {periodLabels[period]}'s Schedule
            </h3>
            {scheduledAppointments.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                No appointments {period === "today" ? "today" : period === "week" ? "this week" : "this month"}
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledAppointments.map((a) => {
                  const cust = a.customer_id ? customers[a.customer_id] : null;
                  const svc = a.service_id ? services[a.service_id] : null;
                  const status = (a.status ?? "confirmed").toLowerCase();
                  return (
                    <div
                      key={a.appt_id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/40 hover:border-primary/30 transition-colors"
                    >
                      <div className="text-center min-w-[70px]">
                        {period !== "today" && (
                          <p className="text-[10px] text-muted-foreground uppercase mb-0.5">
                            {format(new Date(a.appt_datetime), "MMM d")}
                          </p>
                        )}
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
                          {cust?.name ?? "Walk-in"}
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
                            className="h-8 text-xs"
                          >
                            {updating === a.appt_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : s === "no_show" ? "No-Show" : s === "confirmed" ? "Confirm" : "Complete"}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Availability */}
          {selected && (
            <div
              className="rounded-xl border border-border/60 bg-card p-5"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <h3 className="font-display text-lg font-semibold mb-4">
                {selectedBarber?.name ?? "Barber"}'s Availability
              </h3>
              <AvailabilityManager
                barberId={selected}
                barberName={selectedBarber?.name ?? ""}
              />
            </div>
          )}
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