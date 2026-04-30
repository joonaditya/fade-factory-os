import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SHOP_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const DEFAULT_START = "09:00";
const DEFAULT_END = "18:00";

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 21; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 21) TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""} ${ampm}`;
}

function toHHMM(t: string | null | undefined): string {
  if (!t) return DEFAULT_START;
  return t.slice(0, 5);
}

type AvailRow = {
  availability_id: string;
  date: string;
  is_day_off: boolean;
  custom_start: string | null;
  custom_end: string | null;
};

type DayState = {
  rowId: string | null;
  isDayOff: boolean;
  start: string;
  end: string;
  dirty: boolean;
};

export function AvailabilityManager({
  barberId,
  barberName,
}: {
  barberId: string;
  barberName: string;
}) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const days = useMemo(() => {
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 14 }, (_, i) => addDays(ws, i));
  }, []);

  const [states, setStates] = useState<Record<string, DayState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAvail = useCallback(async () => {
    if (!barberId) return;
    setLoading(true);
    const from = format(days[0], "yyyy-MM-dd");
    const to = format(days[13], "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("barber_availability")
      .select("availability_id,date,is_day_off,custom_start,custom_end")
      .eq("barber_id", barberId)
      .gte("date", from)
      .lte("date", to);

    if (error) {
      console.error("fetch availability:", error.message);
      setLoading(false);
      return;
    }

    const rowMap: Record<string, AvailRow> = {};
    (data ?? []).forEach((r: AvailRow) => { rowMap[r.date] = r; });

    const next: Record<string, DayState> = {};
    days.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      const row = rowMap[key];
      next[key] = {
        rowId: row?.availability_id ?? null,
        isDayOff: row?.is_day_off ?? false,
        start: toHHMM(row?.custom_start) || DEFAULT_START,
        end: toHHMM(row?.custom_end) || DEFAULT_END,
        dirty: false,
      };
    });
    setStates(next);
    setLoading(false);
  }, [barberId, days]);

  useEffect(() => { fetchAvail(); }, [fetchAvail]);

  const update = (key: string, patch: Partial<DayState>) =>
    setStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch, dirty: true } }));

  const handleSave = async () => {
    const dirty = Object.entries(states).filter(([, v]) => v.dirty);
    if (!dirty.length) { toast.info("No changes to save"); return; }
    setSaving(true);
    let errored = false;

    for (const [dateKey, s] of dirty) {
      const base = {
        is_day_off: s.isDayOff,
        custom_start: s.isDayOff ? null : s.start + ":00",
        custom_end: s.isDayOff ? null : s.end + ":00",
      };
      if (s.rowId) {
        const { error } = await supabase
          .from("barber_availability")
          .update(base)
          .eq("availability_id", s.rowId);
        if (error) { console.error(dateKey, error.message); errored = true; }
      } else {
        const { data: ins, error } = await supabase
          .from("barber_availability")
          .insert({ ...base, barber_id: barberId, shop_id: SHOP_ID, date: dateKey })
          .select("availability_id")
          .single();
        if (error) { console.error(dateKey, error.message); errored = true; }
        else if (ins) {
          setStates((prev) => ({
            ...prev,
            [dateKey]: { ...prev[dateKey], rowId: ins.availability_id, dirty: false },
          }));
        }
      }
    }

    setSaving(false);
    if (errored) {
      toast.error("Some changes could not be saved");
    } else {
      setStates((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { next[k] = { ...next[k], dirty: false }; });
        return next;
      });
      toast.success(`${barberName}'s availability saved`);
    }
  };

  const hasDirty = Object.values(states).some((d) => d.dirty);
  const week1 = days.slice(0, 7);
  const week2 = days.slice(7);

  if (loading) {
    return (
      <div className="h-28 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Set working hours for the next 2 weeks
        </p>
        <Button size="sm" onClick={handleSave} disabled={!hasDirty || saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>
      </div>

      {[week1, week2].map((week, wi) => (
        <div key={wi}>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">
            Week of {format(week[0], "MMM d")}
          </p>
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-1.5 min-w-fit">
              {week.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const s = states[key];
                if (!s) return null;
                const isPast = key < todayStr;
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-lg border p-2 w-[96px] shrink-0 transition-all",
                      s.isDayOff
                        ? "border-border/30 bg-muted/20"
                        : s.dirty
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/60 bg-card",
                      isPast && "opacity-40 pointer-events-none"
                    )}
                  >
                    <div className="text-center mb-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">
                        {format(day, "EEE")}
                      </p>
                      <p className="font-display font-bold text-base leading-none mt-0.5">
                        {format(day, "d")}
                      </p>
                    </div>

                    {/* On / Off toggle */}
                    <button
                      onClick={() => update(key, { isDayOff: !s.isDayOff })}
                      className={cn(
                        "w-full text-[10px] rounded-md py-1 font-semibold transition-all",
                        s.isDayOff
                          ? "bg-muted text-muted-foreground hover:bg-muted/70"
                          : "bg-primary/15 text-primary hover:bg-primary/25"
                      )}
                    >
                      {s.isDayOff ? "Day Off" : "Working"}
                    </button>

                    {/* Time selects */}
                    {!s.isDayOff && (
                      <div className="mt-2 space-y-1">
                        <select
                          value={s.start}
                          onChange={(e) => update(key, { start: e.target.value })}
                          className="w-full text-[10px] bg-background border border-border/60 rounded px-1 py-0.5 text-center cursor-pointer focus:outline-none focus:border-primary"
                        >
                          {TIME_OPTIONS.slice(0, TIME_OPTIONS.length - 2).map((t) => (
                            <option key={t} value={t}>{fmtTime(t)}</option>
                          ))}
                        </select>
                        <select
                          value={s.end}
                          onChange={(e) => update(key, { end: e.target.value })}
                          className="w-full text-[10px] bg-background border border-border/60 rounded px-1 py-0.5 text-center cursor-pointer focus:outline-none focus:border-primary"
                        >
                          {TIME_OPTIONS.slice(2).map((t) => (
                            <option key={t} value={t}>{fmtTime(t)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
