import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatCard } from "@/components/StatCard";
import { AvailabilityManager } from "@/components/AvailabilityManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import {
  DollarSign,
  CalendarCheck,
  XCircle,
  Activity,
  Loader2,
  Phone,
  Globe,
  UserPlus,
  Copy,
  Check,
  Pencil,
  Trash2,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { format, startOfWeek, subWeeks, startOfDay, endOfDay, startOfMonth } from "date-fns";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Owner Dashboard — Fade Factory OS" }] }),
  component: () => (
    <DashboardShell>
      <OwnerDashboard />
    </DashboardShell>
  ),
});

type Appointment = {
  appt_id: string;
  customer_id: string | null;
  barber_id: string | null;
  service_id: string | null;
  appt_datetime: string;
  end_datetime: string | null;
  status: string | null;
  channel: string | null;
  price: number | null;
};

type AgentLog = {
  id: string;
  agent_name: string | null;
  action: string | null;
  details: string | null;
  created_at: string;
};

type DueCustomer = {
  customer_id: string;
  name: string | null;
  phone: string | null;
  last_visit_date: string | null;
  days_since_visit: number | null;
  last_nudge_sent: string | null;
  preferred_barber_name: string | null;
  barber_preference: string | null;
  shop_id: string | null;
};

type ChannelRow = {
  booking_channel: string | null;
  total_bookings: number | null;
  month: string | null;
  shop_id: string | null;
};
type RevenuePerBarberRow = {
  barber_id: string | null;
  barber_name: string | null;
  revenue: number | null;
  completed_appts: number | null;
  week_start: string | null;
  shop_id: string | null;
};
type PeakHourRow = {
  day_of_week: number | null;
  hour_of_day: number | null;
  appt_count: number | null;
  shop_id: string | null;
};

const COLORS = ["oklch(0.78 0.14 80)", "oklch(0.55 0.13 35)", "oklch(0.65 0.1 150)", "oklch(0.6 0.15 260)"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Record<string, { name: string; price: number }>>({});
  const [barbers, setBarbers] = useState<Record<string, string>>({});
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [revenuePerBarber, setRevenuePerBarber] = useState<RevenuePerBarberRow[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourRow[]>([]);
  const [dueCustomers, setDueCustomers] = useState<DueCustomer[]>([]);
  const [revenuePeriod, setRevenuePeriod] = useState<"today" | "week" | "month">("today");
  const [availBarber, setAvailBarber] = useState<string>("");
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const fourWeeksAgo = subWeeks(new Date(), 4).toISOString();

      const [
        apptsRes,
        servicesRes,
        barbersRes,
        logsRes,
        chRes,
        rpbRes,
        peakRes,
        dueRes,
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, services(price)")
          .gte("appt_datetime", fourWeeksAgo)
          .order("appt_datetime", { ascending: false }),
        supabase.from("services").select("service_id,name,price"),
        supabase.from("barbers").select("barber_id,name"),
        supabase
          .from("agent_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase.from("v_bookings_by_channel").select("*"),
        supabase.from("v_revenue_per_barber").select("*"),
        supabase.from("v_peak_hours").select("*"),
        supabase.from("v_customers_due_for_visit").select("*").limit(10),
      ]);

      setAppointments((apptsRes.data ?? []) as Appointment[]);
      const sMap: Record<string, { name: string; price: number }> = {};
      (servicesRes.data ?? []).forEach((s: { service_id: string; name: string; price: number }) => {
        sMap[s.service_id] = { name: s.name, price: Number(s.price) || 0 };
      });
      setServices(sMap);
      const bMap: Record<string, string> = {};
      (barbersRes.data ?? []).forEach((b: { barber_id: string; name: string }) => {
        bMap[b.barber_id] = b.name;
      });
      setBarbers(bMap);
      const firstId = Object.keys(bMap)[0];
      if (firstId) setAvailBarber((prev) => prev || firstId);
      setAgentLogs((logsRes.data ?? []) as AgentLog[]);
      setChannels((chRes.data ?? []) as ChannelRow[]);
      setRevenuePerBarber((rpbRes.data ?? []) as RevenuePerBarberRow[]);
      setPeakHours((peakRes.data ?? []) as PeakHourRow[]);
      setDueCustomers((dueRes.data ?? []) as DueCustomer[]);
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
    const lastWeekStart = subWeeks(new Date(weekStart), 1).toISOString();
    const monthStart = startOfMonth(new Date()).toISOString();

    const priceFor = (a: Appointment & { services?: { price: number } | null }) =>
      Number(a.price ?? a.services?.price ?? (a.service_id ? services[a.service_id]?.price : 0) ?? 0);

    // Period-based filters
    const todayAppts = appointments.filter(
      (a) => a.appt_datetime >= todayStart && a.appt_datetime <= todayEnd
    );
    const thisWeek = appointments.filter((a) => a.appt_datetime >= weekStart);
    const thisMonth = appointments.filter((a) => a.appt_datetime >= monthStart);
    const lastWeek = appointments.filter(
      (a) => a.appt_datetime >= lastWeekStart && a.appt_datetime < weekStart
    );

    // Helper to get stats for a period
    const getStatsForPeriod = (appts: Appointment[]) => {
      const revenue = appts
        .filter((a) => ["confirmed", "completed"].includes((a.status ?? "").toLowerCase()))
        .reduce((s, a) => s + priceFor(a), 0);
      const completed = appts.filter((a) =>
        ["completed"].includes((a.status ?? "").toLowerCase())
      ).length;
      const avgValue = appts.length > 0 ? revenue / appts.length : 0;
      
      // Repeat customers for this period
      const customerCounts = new Map<string, number>();
      appts.forEach((appt) => {
        const key = appt.customer_id;
        if (!key) return;
        customerCounts.set(key, (customerCounts.get(key) ?? 0) + 1);
      });
      const repeatCustomers = Array.from(customerCounts.values()).filter((count) => count > 1).length;

      // Top services for this period
      const serviceCounts = new Map<string, number>();
      appts.forEach((a) => {
        const name = a.service_id ? services[a.service_id]?.name ?? a.service_id : "Unknown service";
        serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
      });
      const topServices = Array.from(serviceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      return { revenue, completed, avgValue, repeatCustomers, topServices, count: appts.length };
    };

    const todayStats = getStatsForPeriod(todayAppts);
    const weekStats = getStatsForPeriod(thisWeek);
    const monthStats = getStatsForPeriod(thisMonth);

    // Overall metrics
    const total = appointments.length;
    const noShows = appointments.filter((a) =>
      ["no-show", "no_show", "noshow", "cancelled", "canceled"].includes(
        (a.status ?? "").toLowerCase()
      )
    ).length;
    const noShowRate = total > 0 ? (noShows / total) * 100 : 0;

    const wow =
      lastWeek.length === 0
        ? null
        : ((thisWeek.length - lastWeek.length) / lastWeek.length) * 100;

    return {
      // Today
      todayRevenue: todayStats.revenue,
      todayBookings: todayStats.count,
      todayCompleted: todayStats.completed,
      todayAvgValue: todayStats.avgValue,
      todayRepeatCustomers: todayStats.repeatCustomers,
      todayTopServices: todayStats.topServices,
      // Week
      weekRevenue: weekStats.revenue,
      weekBookings: weekStats.count,
      weekCompleted: weekStats.completed,
      weekAvgValue: weekStats.avgValue,
      weekRepeatCustomers: weekStats.repeatCustomers,
      weekTopServices: weekStats.topServices,
      weekNoShows: thisWeek.filter((a) =>
        ["no-show", "no_show", "noshow", "cancelled", "canceled"].includes(
          (a.status ?? "").toLowerCase()
        )
      ).length,
      // Month
      monthRevenue: monthStats.revenue,
      monthBookings: monthStats.count,
      monthCompleted: monthStats.completed,
      monthAvgValue: monthStats.avgValue,
      monthRepeatCustomers: monthStats.repeatCustomers,
      monthTopServices: monthStats.topServices,
      // Overall
      noShowRate,
      wow,
      lastWeekBookings: lastWeek.length,
    };
  }, [appointments, services]);

  const channelData = useMemo(() => {
    if (channels.length > 0) {
      // Aggregate across months by channel
      const map = new Map<string, number>();
      channels.forEach((c) => {
        const k = (c.booking_channel ?? "unknown").toLowerCase();
        map.set(k, (map.get(k) ?? 0) + Number(c.total_bookings ?? 0));
      });
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }
    // Fallback: derive from appointments
    const map = new Map<string, number>();
    appointments.forEach((a) => {
      const k = (a.channel ?? "unknown").toLowerCase();
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [channels, appointments]);

  const barberData = useMemo(() => {
    // Seed every barber at $0 so all appear even with no appointments
    const map = new Map<string, number>(
      Object.values(barbers).map((name) => [name, 0])
    );
    if (revenuePerBarber.length > 0) {
      revenuePerBarber.forEach((r) => {
        const name = r.barber_name ?? (r.barber_id ? barbers[r.barber_id] : null) ?? "—";
        map.set(name, (map.get(name) ?? 0) + Number(r.revenue ?? 0));
      });
    } else {
      appointments.forEach((a) => {
        if (!a.barber_id) return;
        const key = barbers[a.barber_id] ?? "Unknown";
        const price = Number(a.price ?? (a.service_id ? services[a.service_id]?.price : 0) ?? 0);
        map.set(key, (map.get(key) ?? 0) + price);
      });
    }
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }));
  }, [revenuePerBarber, appointments, barbers, services]);

  const heatmap = useMemo(() => {
    // 7 days x 24 hours
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    if (peakHours.length > 0) {
      peakHours.forEach((p) => {
        const day = Number(p.day_of_week ?? 0);
        const hour = Number(p.hour_of_day ?? 0);
        const v = Number(p.appt_count ?? 0);
        if (day >= 0 && day < 7 && hour >= 0 && hour < 24) grid[day][hour] = v;
      });
    } else {
      appointments.forEach((a) => {
        const d = new Date(a.appt_datetime);
        grid[d.getDay()][d.getHours()] += 1;
      });
    }
    const max = Math.max(1, ...grid.flat());
    return { grid, max };
  }, [peakHours, appointments]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const bookingCounts: Record<"today" | "week" | "month", number> = {
    today: stats.todayBookings,
    week: stats.weekBookings,
    month: stats.monthBookings,
  };

  const completedCounts: Record<"today" | "week" | "month", number> = {
    today: stats.todayCompleted,
    week: stats.weekCompleted,
    month: stats.monthCompleted,
  };

  const avgBookingValues: Record<"today" | "week" | "month", number> = {
    today: stats.todayAvgValue,
    week: stats.weekAvgValue,
    month: stats.monthAvgValue,
  };

  const repeatCustomerCounts: Record<"today" | "week" | "month", number> = {
    today: stats.todayRepeatCustomers,
    week: stats.weekRepeatCustomers,
    month: stats.monthRepeatCustomers,
  };

  const topServicesData: Record<"today" | "week" | "month", typeof stats.todayTopServices> = {
    today: stats.todayTopServices,
    week: stats.weekTopServices,
    month: stats.monthTopServices,
  };

  const lastWeekHint = {
    today: "No comparison",
    week: `Last week: ${stats.lastWeekBookings}`,
    month: "Month average",
  };

  const periodLabels: Record<"today" | "week" | "month", string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
  };

  const revenueLabels: Record<"today" | "week" | "month", string> = {
    today: "Today's Revenue",
    week: "This Week's Revenue",
    month: "This Month's Revenue",
  };
  const revenueValues: Record<"today" | "week" | "month", number> = {
    today: stats.todayRevenue,
    week: stats.weekRevenue,
    month: stats.monthRevenue,
  };

  return (
    <div className="p-8 space-y-6">
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-primary text-xs font-medium uppercase tracking-widest">Agent 6</p>
            <h1 className="font-display text-3xl font-bold">Owner Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowInvite(true)} className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Invite Barber
            </Button>
            <div className="min-w-[200px]">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Revenue period
              </label>
              <Select value={revenuePeriod} onValueChange={(value) => setRevenuePeriod(value as "today" | "week" | "month") }>
                <SelectTrigger className="w-full">
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
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={revenueLabels[revenuePeriod]}
          value={`$${revenueValues[revenuePeriod].toFixed(0)}`}
          icon={DollarSign}
          hint="Confirmed + completed"
        />
        <StatCard
          label={`Bookings ${periodLabels[revenuePeriod]}`}
          value={String(bookingCounts[revenuePeriod])}
          icon={CalendarCheck}
          trend={
            revenuePeriod === "week" && stats.wow !== null
              ? { value: `${stats.wow.toFixed(0)}% vs last week`, positive: stats.wow >= 0 }
              : undefined
          }
          hint={lastWeekHint[revenuePeriod]}
        />
        <StatCard
          label="No-Show Rate"
          value={`${stats.noShowRate.toFixed(1)}%`}
          icon={XCircle}
          hint="Cancelled or no-show / total"
        />
        <StatCard
          label="Avg Booking Value"
          value={`$${avgBookingValues[revenuePeriod].toFixed(0)}`}
          icon={Activity}
          hint={`${periodLabels[revenuePeriod]} average`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label={`Completed ${periodLabels[revenuePeriod]}`}
          value={String(completedCounts[revenuePeriod])}
          icon={CalendarCheck}
          hint="Finished appointments"
        />
        <StatCard
          label={`Repeat Customers ${periodLabels[revenuePeriod]}`}
          value={String(repeatCustomerCounts[revenuePeriod])}
          icon={UserPlus}
          hint="Customers with multiple visits"
        />
        <div
          className="rounded-xl border border-border/60 bg-card p-5"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
            Top Services {periodLabels[revenuePeriod]}
          </p>
          {topServicesData[revenuePeriod].length === 0 ? (
            <p className="text-sm text-muted-foreground">No services booked yet</p>
          ) : (
            <div className="space-y-3">
              {topServicesData[revenuePeriod].map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <p className="font-medium truncate">{service.name}</p>
                  <p className="text-sm text-muted-foreground">{service.count} bookings</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Bookings by Channel">
          {channelData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={channelData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {channelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.2 0.014 60)",
                    border: "1px solid oklch(0.3 0.018 55)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 text-xs mt-2">
            {channelData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="capitalize text-muted-foreground">{d.name}</span>
                <span className="font-medium">{d.value}</span>
                {d.name.toLowerCase().includes("voice") && (
                  <Phone className="h-3 w-3 text-muted-foreground" />
                )}
                {d.name.toLowerCase().includes("web") && (
                  <Globe className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Revenue per Barber" className="lg:col-span-2">
          {barberData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barberData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.018 55)" />
                <XAxis dataKey="name" stroke="oklch(0.7 0.02 70)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.02 70)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.2 0.014 60)",
                    border: "1px solid oklch(0.3 0.018 55)",
                    borderRadius: "8px",
                  }}
                  formatter={(v) => [`$${Number(v ?? 0).toFixed(0)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="oklch(0.78 0.14 80)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Heatmap + Availability side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Peak Hours">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex gap-1 mb-1 ml-10">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    className="w-6 text-[10px] text-center text-muted-foreground"
                  >
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {heatmap.grid.map((row, dayIdx) => (
                <div key={dayIdx} className="flex gap-1 mb-1 items-center">
                  <div className="w-10 text-xs text-muted-foreground">{DAY_LABELS[dayIdx]}</div>
                  {row.map((v, h) => {
                    const intensity = v / heatmap.max;
                    return (
                      <div
                        key={h}
                        title={`${DAY_LABELS[dayIdx]} ${h}:00 — ${v} bookings`}
                        className="w-6 h-6 rounded-sm border border-border/30"
                        style={{
                          background:
                            v === 0
                              ? "oklch(0.22 0.014 55)"
                              : `oklch(0.78 0.14 80 / ${0.15 + intensity * 0.85})`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Barber Availability">
          <div className="mb-4">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Select barber
            </label>
            <Select value={availBarber} onValueChange={setAvailBarber}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a barber" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(barbers).map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {availBarber && (
            <AvailabilityManager
              barberId={availBarber}
              barberName={barbers[availBarber] ?? ""}
            />
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Recent Agent Activity">
          {agentLogs.length === 0 ? (
            <Empty msg="No activity yet" />
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {agentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 pb-3 border-b border-border/40 last:border-0"
                >
                  <div className="h-8 w-8 shrink-0 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium text-primary">
                        {log.agent_name ?? "Agent"}
                      </span>{" "}
                      <span className="text-muted-foreground">{log.action}</span>
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {log.details}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Customers Due for a Visit">
          {dueCustomers.length === 0 ? (
            <Empty msg="No customers overdue" />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {dueCustomers.map((c, i) => {
                const name = c.name ?? "Customer";
                const last = c.last_visit_date;
                const days = c.days_since_visit;
                return (
                  <div
                    key={c.customer_id ?? i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-accent/30 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {c.preferred_barber_name && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            Prefers {c.preferred_barber_name}
                          </p>
                        )}
                        {last && (
                          <p className="text-xs text-muted-foreground">
                            Last: {format(new Date(last), "MMM d")}
                          </p>
                        )}
                      </div>
                    </div>
                    {days != null && (
                      <span className="text-xs px-2 py-1 rounded-full bg-destructive/15 text-destructive font-medium">
                        {days}d
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
      <ServicesManager />
      <InviteBarberDialog open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}

// ── Services Manager ─────────────────────────────────────────────────────────

const SHOP_ID_CONST = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

type Service = {
  service_id: string;
  name: string;
  description: string | null;
  duration_mins: number;
  price: number;
  expertise_tag: string | null;
  is_active: boolean;
  sort_order: number;
};

type ServiceForm = {
  name: string;
  description: string;
  duration_mins: string;
  price: string;
  expertise_tag: string;
};

const EMPTY_FORM: ServiceForm = { name: "", description: "", duration_mins: "", price: "", expertise_tag: "" };

function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("shop_id", SHOP_ID_CONST)
      .order("sort_order", { ascending: true });
    setServices((data ?? []) as Service[]);
    setLoadingServices(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description ?? "",
      duration_mins: String(s.duration_mins),
      price: String(s.price),
      expertise_tag: s.expertise_tag ?? "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.price || !form.duration_mins) {
      toast.error("Name, price, and duration are required.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_mins: parseInt(form.duration_mins),
      price: parseFloat(form.price),
      expertise_tag: form.expertise_tag.trim() || null,
      shop_id: SHOP_ID_CONST,
    };

    if (editing) {
      const { error } = await supabase.from("services").update(payload).eq("service_id", editing.service_id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Service updated.");
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Service created.");
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (s: Service) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !s.is_active })
      .eq("service_id", s.service_id);
    if (error) { toast.error(error.message); return; }
    setServices((prev) => prev.map((x) => x.service_id === s.service_id ? { ...x, is_active: !s.is_active } : x));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("services").delete().eq("service_id", deleteTarget.service_id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Service deleted.");
    setDeleteTarget(null);
    load();
  };

  const field = (key: keyof ServiceForm, label: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="mt-1.5"
        {...props}
      />
    </div>
  );

  return (
    <>
      <div className="rounded-xl border border-border/60 bg-card" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <h3 className="font-display text-lg font-semibold">Services</h3>
          <Button size="sm" onClick={openCreate}>
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            New Service
          </Button>
        </div>

        {loadingServices ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : services.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No services yet. Add your first one.</div>
        ) : (
          <div className="divide-y divide-border/40">
            {services.map((s) => (
              <div key={s.service_id} className={`flex items-center gap-4 px-5 py-4 ${!s.is_active ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    {!s.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">Inactive</span>
                    )}
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{s.duration_mins} min</span>
                    {s.expertise_tag && <span>· {s.expertise_tag}</span>}
                  </div>
                </div>
                <span className="font-display font-bold text-base text-primary shrink-0">${Number(s.price).toFixed(2)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title={s.is_active ? "Deactivate" : "Activate"} onClick={() => toggleActive(s)}>
                    {s.is_active
                      ? <ToggleRight className="h-4 w-4 text-primary" />
                      : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteTarget(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && setDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editing ? "Edit Service" : "New Service"}</DialogTitle>
            <DialogDescription>{editing ? "Update the details for this service." : "Fill in the details for the new service."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {field("name", "Name *", { placeholder: "e.g. Classic Fade" })}
            {field("price", "Price ($) *", { type: "number", min: "0", step: "0.01", placeholder: "25.00" })}
            {field("duration_mins", "Duration (mins) *", { type: "number", min: "1", placeholder: "30" })}
            {field("expertise_tag", "Tag", { placeholder: "e.g. Fade, Cut, Beard" })}
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional short description…"
                className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Service"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Delete Service?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. Existing appointments using this service won't be affected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InviteBarberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const SHOP_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [generating, setGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!name.trim()) {
      toast.error("Barber name is required");
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase
      .from("invites")
      .insert({
        role: "barber",
        shop_id: SHOP_ID,
        email: email.trim() || null,
        barber_name: name.trim(),
        barber_specialty: specialty.trim() || null,
      })
      .select("token")
      .single();
    setGenerating(false);
    if (error || !data) {
      toast.error("Failed to create invite");
      return;
    }
    const link = `${window.location.origin}/invite?token=${data.token}`;
    setInviteLink(link);
  };

  const copy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setSpecialty("");
    setInviteLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Invite a Barber</DialogTitle>
          <DialogDescription>
            Fill in the barber's details before sending the invite. The link expires in 7 days and can only be used once.
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="invite-name">Full name <span className="text-destructive">*</span></Label>
              <Input
                id="invite-name"
                placeholder="e.g. Marcus Williams"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="invite-specialty">Specialty <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="invite-specialty"
                placeholder="e.g. Fades & Lineups"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="invite-email">Email <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="barber@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pre-fills the email on their signup form.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={generate} disabled={generating || !name.trim()}>
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Invite Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <Label>Invite link</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={copy}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Share this link with your barber. It can only be used once.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => { setInviteLink(null); setName(""); setEmail(""); setSpecialty(""); }}>
                Generate Another
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border/60 bg-card p-5 ${className}`}
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      <h3 className="font-display text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ msg = "No data yet" }: { msg?: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
      {msg}
    </div>
  );
}