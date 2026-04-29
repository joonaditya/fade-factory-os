import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Scissors,
  Loader2,
  LogOut,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  User,
} from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking")({
  head: () => ({ meta: [{ title: "Book a Cut — Fade Factory OS" }] }),
  component: BookingPage,
});

type Service = {
  service_id: string;
  name: string;
  price: number | null;
  description: string | null;
  duration_mins: number | null;
  shop_id: string | null;
};

type Barber = {
  barber_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  shop_id: string | null;
};

const SHOP_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function generateSlots(date: Date, durationMin: number, booked: string[]): Date[] {
  const slots: Date[] = [];
  const bookedSet = new Set(booked.map((b) => new Date(b).toISOString()));
  for (let h = 9; h < 18; h++) {
    for (let m = 0; m < 60; m += durationMin) {
      const slot = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
      if (slot > new Date() && !bookedSet.has(slot.toISOString())) {
        slots.push(slot);
      }
    }
  }
  return slots;
}

function BookingPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Data
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [slots, setSlots] = useState<Date[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | null>(null);
  const [customerResolveError, setCustomerResolveError] = useState<string | null>(null);

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

  // Resolve customer ID as soon as user is known.
  useEffect(() => {
    if (!user) return;
    const SHOP_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const resolve = async () => {
      // 1. Try matching by user_id
      const { data: byUserId, error: e1 } = await supabase
        .from("customers")
        .select("customer_id, id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (e1) console.error("customers lookup by user_id:", e1.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row1 = byUserId as any;
      if (row1?.customer_id || row1?.id) {
        setResolvedCustomerId(row1.customer_id ?? row1.id);
        return;
      }

    const resolve = async () => {
      // 1. Lookup by email
      if (user.email) {
        const { data: byEmail, error: e2 } = await supabase
          .from("customers")
          .select("customer_id")
          .eq("email", user.email)
          .maybeSingle();
        if (e2) console.error("customers lookup by email:", e2.message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row2 = byEmail as any;
        if (row2?.customer_id || row2?.id) {
          setResolvedCustomerId(row2.customer_id ?? row2.id);
          .maybeSingle<{ customer_id: string }>();
        if (byEmail?.customer_id) {
          setResolvedCustomerId(byEmail.customer_id);
          return;
        }
      }

      // 2. No row found — create one now
      const name = user.email?.split("@")[0] ?? "Customer";
      const { data: created, error: createErr } = await supabase
        .from("customers")
        .insert({ name, email: user.email, phone: "", shop_id: SHOP_ID })
        .select("customer_id")
        .single<{ customer_id: string }>();
      if (createErr) {
        console.error("Customer create error:", createErr.message, createErr.details, createErr.hint);
        setCustomerResolveError(createErr.message);
        console.error("Customer create error:", createErr.message, createErr.details);
        return;
      }
      if (created?.customer_id) setResolvedCustomerId(created.customer_id);
    };
    resolve();
  }, [user]);

  useEffect(() => {
    const load = async () => {
      const [sRes, bRes] = await Promise.all([
        supabase.from("services").select("*").order("price", { ascending: true }),
        supabase.from("barbers").select("*").order("name"),
      ]);
      if (bRes.error) console.error("barbers:", bRes.error);
      if (sRes.error) console.error("services:", sRes.error);

      const svcList = (sRes.data ?? []) as Service[];
      const bList = (bRes.data ?? []) as Barber[];
      setServices(svcList);
      setBarbers(bList);

      setDataLoading(false);
    };
    load();
  }, []);

  // Load slots when barber + date + service are selected
  useEffect(() => {
    if (!selectedBarber || !selectedDate || !selectedService) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    const load = async () => {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23,
        59,
        59
      ).toISOString();
      const { data } = await supabase
        .from("appointments")
        .select("appt_datetime")
        .eq("barber_id", selectedBarber.barber_id)
        .gte("appt_datetime", dayStart)
        .lte("appt_datetime", dayEnd);
      const booked = (data ?? []).map((a: { appt_datetime: string }) => a.appt_datetime);
      const duration = selectedService.duration_mins ?? 30;
      setSlots(generateSlots(selectedDate, duration, booked));
      setSlotsLoading(false);
    };
    load();
  }, [selectedBarber, selectedDate, selectedService]);

  const handleConfirm = async () => {
    if (!selectedService || !selectedBarber || !selectedSlot || !user) return;
    setSubmitting(true);

    const duration = selectedService.duration_mins ?? 30;
    const apptDatetime = selectedSlot.toISOString();
    const endDatetime = new Date(selectedSlot.getTime() + duration * 60000).toISOString();

    if (!resolvedCustomerId) {
      setSubmitting(false);
      toast.error(
        customerResolveError
          ? `Could not create customer profile: ${customerResolveError}`
          : "Could not set up your customer profile. Please try logging out and back in."
      );
      return;
    }

    const { error } = await supabase.from("appointments").insert({
      appt_datetime: apptDatetime,
      end_datetime: endDatetime,
      barber_id: selectedBarber.barber_id,
      service_id: selectedService.service_id,
      customer_id: resolvedCustomerId,
      shop_id: SHOP_ID,
      status: "confirmed",
      booking_channel: "website",
      price: selectedService.price,
    });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep(4);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Next 14 days (skip today if it's past 5pm)
  const today = new Date();
  const dateOptions: Date[] = Array.from({ length: 14 }, (_, i) => addDays(today, i + 1));

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
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
            className="text-muted-foreground"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-3xl">
        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {[
              { n: 1, label: "Service" },
              { n: 2, label: "Barber & Time" },
              { n: 3, label: "Confirm" },
            ].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    step === n
                      ? "text-primary-foreground"
                      : step > n
                        ? "text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                  style={
                    step >= n
                      ? { background: "var(--gradient-gold)" }
                      : undefined
                  }
                >
                  {step > n ? <CheckCircle2 className="h-4 w-4" /> : n}
                </div>
                <span
                  className={cn(
                    "text-sm hidden sm:block",
                    step === n ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
                {i < 2 && (
                  <div
                    className={cn(
                      "h-px w-8 sm:w-16 transition-all",
                      step > n ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: Choose Service ── */}
        {step === 1 && (
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">
              Choose a Service
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              What are you getting today?
            </p>

            {dataLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {services.map((svc) => (
                  <button
                    key={svc.service_id}
                    onClick={() => {
                      setSelectedService(svc);
                      setStep(2);
                    }}
                    className={cn(
                      "rounded-xl border p-5 text-left transition-all hover:border-primary/50",
                      "bg-card",
                      selectedService?.service_id === svc.service_id
                        ? "border-primary ring-1 ring-primary bg-primary/5"
                        : "border-border/60 hover:bg-muted/30"
                    )}
                    style={{ boxShadow: "var(--shadow-elegant)" }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="h-9 w-9 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: "var(--gradient-gold)" }}
                      >
                        <Scissors className="h-4 w-4 text-primary-foreground" />
                      </div>
                      {svc.price != null && (
                        <span className="font-display text-xl font-bold text-primary">
                          ${Number(svc.price).toFixed(0)}
                        </span>
                      )}
                    </div>
                    <p className="font-display font-semibold">{svc.name}</p>
                    {svc.description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {svc.description}
                      </p>
                    )}
                    {svc.duration_mins != null && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        {svc.duration_mins} min
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Choose Barber, Date, Time ── */}
        {step === 2 && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="font-display text-3xl font-bold mb-1">
              Pick Your Barber
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              Then choose a date and available time.
            </p>

            {/* Barbers */}
            {dataLoading ? (
              <div className="h-24 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {barbers.map((b) => (
                  <button
                    key={b.barber_id}
                    onClick={() => {
                      setSelectedBarber(b);
                      setSelectedSlot(null);
                    }}
                    className={cn(
                      "rounded-xl border p-4 text-center transition-all",
                      "bg-card",
                      selectedBarber?.barber_id === b.barber_id
                        ? "border-primary ring-1 ring-primary bg-primary/5"
                        : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                    )}
                    style={{ boxShadow: "var(--shadow-elegant)" }}
                  >
                    {b.photo_url ? (
                      <img
                        src={b.photo_url}
                        alt={b.name}
                        className="h-12 w-12 rounded-full mx-auto mb-2 object-cover"
                      />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-bold font-display"
                        style={{
                          background: "var(--gradient-gold)",
                          color: "var(--primary-foreground)",
                        }}
                      >
                        {b.name[0]}
                      </div>
                    )}
                    <p className="font-medium text-sm">{b.name}</p>
                    {b.bio && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{b.bio}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Date picker */}
            {selectedBarber && (
              <>
                <h2 className="font-display text-lg font-semibold mb-3">
                  Choose a Date
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                  {dateOptions.map((d) => {
                    const active = selectedDate?.toDateString() === d.toDateString();
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => {
                          setSelectedDate(d);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "shrink-0 rounded-lg border p-3 text-center min-w-[60px] transition-all",
                          active
                            ? "border-primary ring-1 ring-primary bg-primary/10 text-primary"
                            : "border-border/60 bg-card hover:border-primary/40"
                        )}
                      >
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {format(d, "EEE")}
                        </p>
                        <p className="font-display font-bold text-lg leading-none mt-0.5">
                          {format(d, "d")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(d, "MMM")}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Time slots */}
            {selectedBarber && selectedDate && (
              <>
                <h2 className="font-display text-lg font-semibold mb-3">
                  Available Times
                </h2>
                {slotsLoading ? (
                  <div className="h-20 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No available slots for this day. Try another date.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6">
                    {slots.map((slot) => {
                      const active =
                        selectedSlot?.toISOString() === slot.toISOString();
                      return (
                        <button
                          key={slot.toISOString()}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "rounded-lg border py-2 px-1 text-xs font-medium transition-all",
                            active
                              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                              : "border-border/60 bg-card hover:border-primary/40"
                          )}
                        >
                          {format(slot, "h:mm a")}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end">
              <Button
                disabled={!selectedBarber || !selectedDate || !selectedSlot}
                onClick={() => setStep(3)}
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && selectedService && selectedBarber && selectedSlot && (
          <div>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="font-display text-3xl font-bold mb-1">
              Confirm Booking
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              Double-check your details before confirming.
            </p>

            <div
              className="rounded-2xl border border-border/60 bg-card p-6 mb-6 space-y-4"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <Row
                icon={Scissors}
                label="Service"
                value={`${selectedService.name}${selectedService.price != null ? ` — $${Number(selectedService.price).toFixed(0)}` : ""}`}
              />
              <Row
                icon={User}
                label="Barber"
                value={selectedBarber.name}
              />
              <Row
                icon={Calendar}
                label="Date"
                value={format(selectedSlot, "EEEE, MMMM d, yyyy")}
              />
              <Row
                icon={Clock}
                label="Time"
                value={format(selectedSlot, "h:mm a")}
              />
              {selectedService.duration_mins != null && (
                <Row
                  icon={Clock}
                  label="Duration"
                  value={`${selectedService.duration_mins} min`}
                />
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirm}
              disabled={submitting}
              style={{ boxShadow: "var(--shadow-gold)" }}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm Appointment
            </Button>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && selectedService && selectedBarber && selectedSlot && (
          <div className="text-center py-10">
            <div
              className="h-16 w-16 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ background: "var(--gradient-gold)" }}
            >
              <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">
              You're booked!
            </h1>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
              See you on{" "}
              <span className="text-foreground font-medium">
                {format(selectedSlot, "EEEE, MMMM d")}
              </span>{" "}
              at{" "}
              <span className="text-foreground font-medium">
                {format(selectedSlot, "h:mm a")}
              </span>{" "}
              with{" "}
              <span className="text-foreground font-medium">
                {selectedBarber.name}
              </span>
              .
            </p>

            <div
              className="rounded-2xl border border-border/60 bg-card p-6 mb-8 max-w-sm mx-auto text-left space-y-3"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <Row icon={Scissors} label="Service" value={selectedService.name} />
              <Row
                icon={Calendar}
                label="Date"
                value={format(selectedSlot, "MMM d, yyyy")}
              />
              <Row
                icon={Clock}
                label="Time"
                value={format(selectedSlot, "h:mm a")}
              />
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setSelectedService(null);
                  setSelectedBarber(null);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                }}
              >
                Book Another
              </Button>
              <Link to="/">
                <Button>Back to Home</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: "var(--gradient-gold)" }}
      >
        <Icon className="h-4 w-4 text-primary-foreground" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
