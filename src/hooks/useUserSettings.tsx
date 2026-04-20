import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type RunMode = "inline" | "newtab";

interface Settings {
  navbar_color: string; // HSL string, e.g. "222 47% 11%"
  run_mode: RunMode;
}

interface Ctx {
  settings: Settings;
  setNavbarColor: (hsl: string) => Promise<void>;
  setRunMode: (m: RunMode) => Promise<void>;
  loading: boolean;
}

const DEFAULTS: Settings = { navbar_color: "222 47% 11%", run_mode: "inline" };
const C = createContext<Ctx>({ settings: DEFAULTS, setNavbarColor: async () => {}, setRunMode: async () => {}, loading: true });

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  // Apply CSS variable globally
  useEffect(() => {
    document.documentElement.style.setProperty("--navbar", settings.navbar_color);
  }, [settings.navbar_color]);

  useEffect(() => {
    if (!user) { setSettings(DEFAULTS); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("user_settings").select("navbar_color,run_mode").eq("user_id", user.id).maybeSingle();
      if (data) setSettings({ navbar_color: data.navbar_color, run_mode: data.run_mode as RunMode });
      else {
        await supabase.from("user_settings").insert({ user_id: user.id });
      }
      setLoading(false);
    })();
  }, [user]);

  const persist = useCallback(async (patch: Partial<Settings>) => {
    if (!user) return;
    setSettings((s) => ({ ...s, ...patch }));
    await supabase.from("user_settings").upsert({ user_id: user.id, ...{ ...settings, ...patch } });
  }, [user, settings]);

  return (
    <C.Provider value={{
      settings, loading,
      setNavbarColor: (hsl) => persist({ navbar_color: hsl }),
      setRunMode: (m) => persist({ run_mode: m }),
    }}>{children}</C.Provider>
  );
};

export const useSettings = () => useContext(C);
