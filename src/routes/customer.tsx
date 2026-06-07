import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { format, isPast, isFuture } from "date-fns";
import {
  Calendar,
  Clock,
  Scissors,
  User,
  XCircle,
  Loader2,
  PlusCircle,
  CheckCircle2,
  Ban,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer")({
  head: () => ({ meta: [{ title: "My Appointments — Fade Factory OS" }] }),
  component: () => (
    <DashboardShell>
      <CustomerDashboard />
    </DashboardShell>
  ),
});

const SHOP_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

type Appointment = {
  appt_id: string;
  appt_datetime: string;
  end_datetime: string;
  status: string;
  barber_id: string | null;
  service_id: string | null;
  barbers: { name: string } | null;
  services: { name: string; price: number | null } | null;
};

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  confirmed:  { label: "Confirmed",  icon: CheckCircle2, color: "text-green-500" },
  completed:  { label: "Completed",  icon: CheckCircle2, color: "text-muted-foreground" },
  cancelled:  { label: "Cancelled",  icon: Ban,          color: "text-destructive" },
  no_show:    { label: "No-show",    icon: AlertCircle,  color: "text-destructive" },
};

function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Resolve customer_id from user_id
  useEffect(() => {
    if (!user) return;
    supabase
      .from("customers")
      .select("customer_id")
      .eq("shop_id", SHOP_ID)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.customer_id) setCustomerId(data.customer_id);
        else setLoading(false);
      });
  }, [user]);

  // Load appointments once customer_id is known
  useEffect(() => {
    if (!customerId) return;
    supabase
      .from("appointments")
      .select("appt_id, appt_datetime, end_datetime, status, barber_id, service_id, barbers(name), services(name, price)")
      .eq("customer_id", customerId)
      .order("appt_datetime", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []).map((r: any) => ({
          ...r,
          barbers: Array.isArray(r.barbers) ? (r.barbers[0] ?? null) : r.barbers,
          services: Array.isArray(r.services) ? (r.services[0] ?? null) : r.services,
        }));
        setAppointments(rows as Appointment[]);
        setLoading(false);
      });
  }, [customerId]);

  const cancel = async (apptId: string) => {
    setCancelling(apptId);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("appt_id", apptId);
    setCancelling(null);
    if (error) {
      toast.error("Could not cancel appointment. Try again.");
      return;
    }
    setAppointments((prev) =>
      prev.map((a) => (a.appt_id === apptId ? { ...a, status: "cancelled" } : a))
    );
    toast.success("Appointment cancelled.");
  };

  const upcoming = appointments.filter(
    (a) => isFuture(new Date(a.appt_datetime)) && a.status === "confirmed"
  );
  const past = appointments.filter(
    (a) => isPast(new Date(a.appt_datetime)) || a.status !== "confirmed"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-primary text-xs font-medium uppercase tracking-widest">My Account</p>
          <h1 className="font-display text-3xl font-bold">My Appointments</h1>
        </div>
        <Button onClick={() => navigate({ to: "/booking" })} style={{ boxShadow: "var(--shadow-gold)" }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Book a Cut
        </Button>
      </header>

      {/* Upcoming */}
      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div
            className="rounded-xl border border-border/60 bg-card p-8 text-center"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <Scissors className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate({ to: "/booking" })}
            >
              Book Now
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <AppointmentCard
                key={a.appt_id}
                appt={a}
                onCancel={cancel}
                cancelling={cancelling === a.appt_id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Past Appointments</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past appointments yet.</p>
        ) : (
          <div className="space-y-3">
            {past.map((a) => (
              <AppointmentCard key={a.appt_id} appt={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AppointmentCard({
  appt,
  onCancel,
  cancelling = false,
}: {
  appt: Appointment;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
}) {
  const meta = STATUS_META[appt.status] ?? STATUS_META.confirmed;
  const StatusIcon = meta.icon;
  const isUpcoming = isFuture(new Date(appt.appt_datetime)) && appt.status === "confirmed";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 flex items-start justify-between gap-4 transition-opacity",
        isUpcoming ? "border-border/60" : "border-border/30 opacity-70"
      )}
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      <div className="flex gap-4 items-start flex-1 min-w-0">
        {/* Date block */}
        <div
          className="shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center text-primary-foreground"
          style={{ background: "var(--gradient-gold)" }}
        >
          <span className="text-xs font-bold uppercase leading-none">
            {format(new Date(appt.appt_datetime), "MMM")}
          </span>
          <span className="text-lg font-bold leading-none">
            {format(new Date(appt.appt_datetime), "d")}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-display font-semibold text-base leading-tight">
            {appt.services?.name ?? "Service"}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {appt.barbers?.name ?? "Barber"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(appt.appt_datetime), "h:mm a")}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(appt.appt_datetime), "EEEE, MMMM d, yyyy")}
            </span>
            {appt.services?.price != null && (
              <span className="font-medium text-foreground">${appt.services.price}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={cn("flex items-center gap-1 text-xs font-medium", meta.color)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
        {isUpcoming && onCancel && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive text-xs h-7 px-2"
            onClick={() => onCancel(appt.appt_id)}
            disabled={cancelling}
          >
            {cancelling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Cancel
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
