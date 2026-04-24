import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zhwwojqbpmoqvvebbcjv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpod3dvanFicG1vcXZ2ZWJiY2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTQ1NjgsImV4cCI6MjA5MjMzMDU2OH0.iShGbRnbGYj3FlwO65pyrswVDtSCiZhL_29zHhPTZFc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});