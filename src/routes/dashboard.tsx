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
} from "lucide-react";
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
    </div>
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