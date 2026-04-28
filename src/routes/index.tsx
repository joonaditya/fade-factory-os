import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, ROLE_HOME } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Scissors,
  ArrowRight,
  Star,
  Clock,
  User,
  LogOut,
  LayoutDashboard,
  Phone,
  Calendar,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  MapPin,
  Instagram,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fade Factory — Premium Barbershop" },
      {
        name: "description",
        content: "Premium cuts, fades, and grooming. Book your next appointment at Fade Factory.",
      },
    ],
  }),
  component: Landing,
});

type Service = {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  duration_min: number | null;
};

type Barber = {
  barber_id: string;
  name: string;
  rating: number | null;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
};

const IMGS = {
  hero: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1920&q=80",
  divider: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1920&q=80",
  about: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1920&q=80",
};

function useParallax(speed = 0.4) {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      setOffset(center * speed);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);

  return { ref, offset };
}

function Landing() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  // Global scroll for hero parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const load = async () => {
      const [sRes, bRes] = await Promise.all([
        supabase.from("services").select("*").order("price", { ascending: true }),
        supabase.from("barbers").select("*").order("name"),
      ]);
      setServices((sRes.data ?? []) as Service[]);
      setBarbers((bRes.data ?? []) as Barber[]);
      setDataLoading(false);
    };
    load();
  }, []);

  const handleBookNow = () => {
    navigate({ to: user ? "/booking" : "/login" });
  };

  const divider1 = useParallax(0.35);
  const divider2 = useParallax(0.35);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky Nav ── */}
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--gradient-gold)" }}>
              <Scissors className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              Fade Factory <span className="text-primary">OS</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#team" className="hover:text-foreground transition-colors">Our Team</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleBookNow} className="hidden sm:inline-flex" style={{ boxShadow: "var(--shadow-gold)" }}>
              Book Now <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 rounded-full border border-border/60 bg-card flex items-center justify-center hover:border-primary/50 transition-colors overflow-hidden">
                  {!authLoading && user ? (
                    <div className="h-full w-full flex items-center justify-center text-sm font-bold" style={{ background: "var(--gradient-gold)", color: "var(--primary-foreground)" }}>
                      {(user.email ?? "?")[0].toUpperCase()}
                    </div>
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user && profile ? (
                  <>
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate text-sm">{user.email}</span>
                        <span className="text-[11px] text-muted-foreground font-normal capitalize">{profile.role}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: ROLE_HOME[profile.role] })}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />My Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                      <LogOut className="h-4 w-4 mr-2" />Log out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild><Link to="/login">Log in</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/signup">Sign up</Link></DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Hero with Parallax ── */}
      <section className="relative h-screen min-h-[600px] overflow-hidden flex items-center justify-center">
        {/* Parallax background image */}
        <div
          className="absolute inset-0 scale-110"
          style={{
            backgroundImage: `url(${IMGS.hero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `translateY(${scrollY * 0.35}px)`,
            willChange: "transform",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(20,14,8,0.7) 0%, rgba(20,14,8,0.5) 50%, rgba(20,14,8,0.85) 100%)" }} />

        {/* Content */}
        <div
          className="relative z-10 text-center px-6 max-w-4xl mx-auto"
          style={{ transform: `translateY(${scrollY * 0.12}px)`, willChange: "transform" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-xs text-white/80 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Now accepting bookings — Chicago, IL
          </div>

          <h1 className="font-display text-6xl sm:text-8xl font-bold mb-6 leading-[1.02] text-white drop-shadow-2xl">
            Look Sharp.
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-gold)" }}>
              Feel Confident.
            </span>
          </h1>

          <p className="text-lg text-white/70 max-w-xl mx-auto mb-10 leading-relaxed">
            Premium fades, cuts, and grooming — powered by AI scheduling so you spend less time waiting and more time looking fresh.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg" onClick={handleBookNow} className="font-medium text-base h-12 px-8" style={{ boxShadow: "var(--shadow-gold)" }}>
              Book Your Cut <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <a href="#team">
              <Button size="lg" variant="outline" className="h-12 px-8 border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent">
                Meet the Team
              </Button>
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-8 mt-14 flex-wrap text-sm text-white/60">
            {[
              { icon: Star, text: "4.9★ Avg Rating" },
              { icon: Clock, text: "10+ Years Experience" },
              { icon: MapPin, text: "Chicago, IL" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-1.5">
                <b.icon className="h-4 w-4 text-primary" />
                {b.text}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 text-xs animate-bounce">
          <span>scroll</span>
          <div className="h-6 w-px bg-white/30" />
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="container mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <p className="text-primary text-xs font-medium uppercase tracking-widest mb-3">What We Offer</p>
          <h2 className="font-display text-4xl font-bold">Our Services</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm">
            From classic cuts to fresh fades — every service delivered with precision.
          </p>
        </div>

        {dataLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/60 h-48 animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">No services listed yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="group rounded-xl border border-border/60 bg-card p-6 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 flex flex-col"
                style={{ boxShadow: "var(--shadow-elegant)" }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gradient-gold)" }}>
                    <Scissors className="h-5 w-5 text-primary-foreground" />
                  </div>
                  {svc.price != null && (
                    <span className="font-display text-2xl font-bold text-primary">${Number(svc.price).toFixed(0)}</span>
                  )}
                </div>
                <h3 className="font-display text-lg font-semibold mb-1">{svc.name}</h3>
                {svc.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2 flex-1">{svc.description}</p>
                )}
                {svc.duration_min != null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Clock className="h-3 w-3" />{svc.duration_min} min
                  </div>
                )}
                <button
                  onClick={handleBookNow}
                  className="mt-auto flex items-center justify-between w-full text-sm text-muted-foreground hover:text-primary transition-colors pt-3 border-t border-border/40"
                >
                  Book this service <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Parallax Divider 1 ── */}
      <div ref={divider1.ref} className="relative h-72 overflow-hidden">
        <div
          className="absolute inset-0 scale-110"
          style={{
            backgroundImage: `url(${IMGS.divider})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `translateY(${divider1.offset}px)`,
            willChange: "transform",
          }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,14,8,0.85) 0%, rgba(20,14,8,0.5) 60%, rgba(20,14,8,0.75) 100%)" }} />
        <div className="relative z-10 h-full flex items-center px-10 md:px-20">
          <div className="max-w-xl">
            <p className="text-primary text-xs font-medium uppercase tracking-widest mb-2">The Craft</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
              Every fade tells a story. <br />Let's write yours.
            </h2>
            <Button className="mt-6" onClick={handleBookNow} style={{ boxShadow: "var(--shadow-gold)" }}>
              Book Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Barbers ── */}
      <section id="team" className="container mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <p className="text-primary text-xs font-medium uppercase tracking-widest mb-3">The Crew</p>
          <h2 className="font-display text-4xl font-bold">Meet the Team</h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm">
            Skilled barbers with a passion for precision and style.
          </p>
        </div>

        {dataLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/60 h-64 animate-pulse" />
            ))}
          </div>
        ) : barbers.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">No barbers listed yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {barbers.map((b) => (
              <div
                key={b.barber_id}
                className="group rounded-xl border border-border/60 bg-card p-6 text-center hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 flex flex-col"
                style={{ boxShadow: "var(--shadow-elegant)" }}
              >
                <div className="relative mx-auto mb-4 w-fit">
                  {b.photo_url ? (
                    <img src={b.photo_url} alt={b.name} className="h-20 w-20 rounded-full object-cover ring-2 ring-border/60 group-hover:ring-primary/40 transition-all" />
                  ) : (
                    <div className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-display font-bold ring-2 ring-border/60 group-hover:ring-primary/40 transition-all" style={{ background: "var(--gradient-gold)", color: "var(--primary-foreground)" }}>
                      {b.name[0]}
                    </div>
                  )}
                  {b.rating != null && (
                    <div className="absolute -bottom-1 -right-2 flex items-center gap-0.5 bg-card border border-border/60 rounded-full px-2 py-0.5 text-[10px] font-medium">
                      <Star className="h-2.5 w-2.5 text-primary fill-primary" />
                      {Number(b.rating).toFixed(1)}
                    </div>
                  )}
                </div>
                <h3 className="font-display text-lg font-semibold">{b.name}</h3>
                {b.specialty && <p className="text-xs text-primary mt-0.5">{b.specialty}</p>}
                {b.bio && <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2 flex-1">{b.bio}</p>}
                <Button size="sm" variant="outline" onClick={handleBookNow} className="mt-4 w-full text-xs">
                  Book with {b.name.split(" ")[0]}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Parallax Divider 2 / About ── */}
      <section id="about" ref={divider2.ref} className="relative overflow-hidden">
        <div
          className="absolute inset-0 scale-110"
          style={{
            backgroundImage: `url(${IMGS.about})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            transform: `translateY(${divider2.offset}px)`,
            willChange: "transform",
          }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(20,14,8,0.93) 0%, rgba(20,14,8,0.75) 50%, rgba(20,14,8,0.88) 100%)" }} />

        <div className="relative z-10 container mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-primary text-xs font-medium uppercase tracking-widest mb-3">Why Fade Factory</p>
              <h2 className="font-display text-4xl font-bold mb-4 leading-tight text-white">
                Powered by AI.<br />Built for barbers.
              </h2>
              <p className="text-white/60 leading-relaxed mb-8 text-sm">
                Fade Factory OS is more than a booking system — it's an intelligent operating layer that handles scheduling, reminders, and customer retention while you focus on the craft.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Phone, label: "AI Receptionist", desc: "24/7 booking via phone, web, or SMS." },
                  { icon: ShieldCheck, label: "No-Show Prevention", desc: "Smart reminders reduce no-shows by up to 60%." },
                  { icon: Sparkles, label: "Retention AI", desc: "Brings regulars back before your competition does." },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--gradient-gold)" }}>
                      <item.icon className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">{item.label}</p>
                      <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8" style={{ boxShadow: "var(--shadow-elegant)" }}>
              <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "var(--gradient-gold)" }}>
                <Scissors className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2 text-white">Ready for your next cut?</h3>
              <p className="text-white/60 text-sm mb-6 leading-relaxed">
                Book in under 2 minutes. Choose your barber, pick a time, and we'll handle the rest.
              </p>
              <Button className="w-full" size="lg" onClick={handleBookNow} style={{ boxShadow: "var(--shadow-gold)" }}>
                Book an Appointment <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!user && (
                <p className="text-center text-xs text-white/40 mt-4">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline">Log in</Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
                <Scissors className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">Fade Factory <span className="text-primary">OS</span></span>
            </Link>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Fade Factory OS — Built for barbers.</p>
            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              <a href="#services" className="hover:text-foreground transition-colors">Services</a>
              <a href="#team" className="hover:text-foreground transition-colors">Team</a>
              <Link to="/login" className="hover:text-foreground transition-colors">Log in</Link>
              <Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
              <a href="#" aria-label="Instagram" className="hover:text-foreground transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
