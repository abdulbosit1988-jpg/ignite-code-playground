import { useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useUserSettings";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Palette, Play, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS: { name: string; hsl: string }[] = [
  { name: "Тёмно-синий", hsl: "222 47% 11%" },
  { name: "Чёрный", hsl: "0 0% 5%" },
  { name: "Изумруд", hsl: "152 60% 18%" },
  { name: "Океан", hsl: "199 70% 18%" },
  { name: "Фиолетовый", hsl: "270 50% 20%" },
  { name: "Бордо", hsl: "350 60% 22%" },
  { name: "Графит", hsl: "215 14% 18%" },
  { name: "Кофе", hsl: "25 30% 18%" },
];

const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const Settings = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const { settings, setNavbarColor, setRunMode } = useSettings();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border sticky top-0 z-20" style={{ background: `hsl(var(--navbar))` }}>
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="font-bold text-lg">Настройки</h1>
        </div>
      </header>

      <div className="container py-8 max-w-2xl space-y-8">
        <section className="glass rounded-xl p-6">
          <p className="text-sm text-muted-foreground">Аккаунт</p>
          <p className="font-medium">{user?.email}</p>
        </section>

        <section className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Цвет верхней панели</h2></div>
          <p className="text-sm text-muted-foreground">Выбери цвет — изменения применяются сразу ко всему сайту.</p>

          <div>
            <Label className="text-xs">Готовые цвета</Label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-2">
              {PRESET_COLORS.map((c) => (
                <button key={c.hsl} onClick={() => { setNavbarColor(c.hsl); toast.success(`Цвет: ${c.name}`); }}
                  className={`h-12 rounded-lg border-2 transition-all ${settings.navbar_color === c.hsl ? "border-primary scale-105" : "border-border"}`}
                  style={{ background: `hsl(${c.hsl})` }} title={c.name} />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="picker" className="text-xs">Свой цвет</Label>
            <div className="flex items-center gap-3 mt-2">
              <input id="picker" type="color" defaultValue="#1e293b"
                onChange={(e) => setNavbarColor(hexToHsl(e.target.value))}
                className="h-12 w-20 rounded cursor-pointer bg-transparent border border-border" />
              <div className="h-12 flex-1 rounded-lg border border-border" style={{ background: `hsl(${settings.navbar_color})` }} />
            </div>
          </div>
        </section>

        <section className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2"><Play className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">Режим запуска кода</h2></div>
          <p className="text-sm text-muted-foreground">Где открывать результат, когда нажимаешь Run.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <button onClick={() => setRunMode("inline")}
              className={`p-4 rounded-lg border-2 text-left transition-all ${settings.run_mode === "inline" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
              <div className="flex items-center gap-2 mb-1"><Play className="w-4 h-4" /><span className="font-medium">На сайте</span></div>
              <p className="text-xs text-muted-foreground">Результат показывается рядом с редактором.</p>
            </button>
            <button onClick={() => setRunMode("newtab")}
              className={`p-4 rounded-lg border-2 text-left transition-all ${settings.run_mode === "newtab" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
              <div className="flex items-center gap-2 mb-1"><ExternalLink className="w-4 h-4" /><span className="font-medium">В новой вкладке</span></div>
              <p className="text-xs text-muted-foreground">Открывается отдельное окно браузера.</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
