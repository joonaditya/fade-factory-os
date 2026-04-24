import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AppRole = "owner" | "barber" | "customer";

export type Profile = {
  id: string;
  role: AppRole;
  shop_id: string | null;
  created_at: string;
};

export const ROLE_HOME: Record<AppRole, string> = {
  owner: "/dashboard",
  barber: "/barber",
  customer: "/booking",
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: AppRole | null }>;
  signUp: (
    email: string,
    password: string,
    role: AppRole
  ) => Promise<{ error: string | null; role: AppRole | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, shop_id, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("fetchProfile error", error);
    return null;
  }
  return (data as Profile) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Defer to avoid deadlocking the auth callback
        setTimeout(() => {
          fetchProfile(s.user.id).then(setProfile);
        }, 0);
      } else {
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        setProfile(await fetchProfile(data.session.user.id));
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user,
    session,
    profile,
    loading,
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message, role: null };
      const p = data.user ? await fetchProfile(data.user.id) : null;
      setProfile(p);
      return { error: null, role: p?.role ?? null };
    },
    signUp: async (email, password, role) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { role },
        },
      });
      if (error) return { error: error.message, role: null };
      const newUser = data.user;
      if (newUser) {
        const { error: pErr } = await supabase
          .from("profiles")
          .upsert({ id: newUser.id, role }, { onConflict: "id" });
        if (pErr) {
          console.error("profile insert error", pErr);
          return { error: pErr.message, role: null };
        }
        if (data.session) {
          setProfile(await fetchProfile(newUser.id));
        }
      }
      return { error: null, role };
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}