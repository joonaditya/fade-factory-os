import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-5"
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </p>
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center"
          style={{ background: "var(--gradient-gold)" }}
        >
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {trend && (
        <p
          className={`text-xs mt-2 font-medium ${
            trend.positive ? "text-emerald-400" : "text-destructive"
          }`}
        >
          {trend.positive ? "▲" : "▼"} {trend.value}
        </p>
      )}
    </div>
  );
}