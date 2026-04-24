import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Scissors, Phone, Calendar, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fade Factory OS — AI-Powered Barbershop Management" },
      {
        name: "description",
        content:
          "The all-in-one AI operating system for modern barbershops. Smart scheduling, an AI receptionist, no-show prevention, and retention — built in.",
      },
      { property: "og:title", content: "Fade Factory OS — AI-Powered Barbershop Management" },
      {
        property: "og:description",
        content: "AI receptionist, smart scheduling, retention. Run your shop on autopilot.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Phone,
    title: "AI Receptionist",
    desc: "Answers every call 24/7, books appointments, and handles rescheduling — in your shop's voice.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    desc: "Optimizes the chair, fills gaps, and balances barbers based on demand and customer history.",
  },
  {
    icon: ShieldCheck,
    title: "No-Show Prevention",
    desc: "Predicts at-risk bookings and nudges customers automatically with smart reminders.",
  },
  {
    icon: Sparkles,
    title: "Retention AI",
    desc: "Knows when a regular is overdue and brings them back before your competition does.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      {/* Nav */}
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/60">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-md flex items-center justify-center"
              style={{ background: "var(--gradient-gold)" }}
            >
              <Scissors className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              Fade Factory <span className="text-primary">OS</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="font-medium">
                Get started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/40 text-xs text-muted-foreground mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          The operating system for modern barbershops
        </div>
        <h1 className="font-display text-5xl sm:text-7xl font-bold mb-6 leading-[1.05]">
          AI-Powered <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-gold)" }}
          >
            Barbershop Management
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          From the first ring to the last fade — Fade Factory OS runs your front desk,
          chair, and customer relationships, automatically.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/signup">
            <Button
              size="lg"
              className="font-medium shadow-lg"
              style={{ boxShadow: "var(--shadow-gold)" }}
            >
              Book an appointment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              Owner login
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20 border-t border-border/40">
        <div className="text-center mb-16">
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-3">
            The Stack
          </p>
          <h2 className="font-display text-4xl font-bold">Four AI agents. One sharp shop.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border/60 bg-card p-6 hover:border-primary/40 transition-all"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <div
                className="h-11 w-11 rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                style={{ background: "var(--gradient-gold)" }}
              >
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Fade Factory OS — Built for barbers.
      </footer>
    </div>
  );
}
