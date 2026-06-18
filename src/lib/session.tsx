import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Ctx = { session: Session | null | undefined };
const SessionCtx = createContext<Ctx>({ session: undefined });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <SessionCtx.Provider value={{ session }}>{children}</SessionCtx.Provider>
  );
}

export function useSession() {
  return useContext(SessionCtx);
}
