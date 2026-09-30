import { useEffect, useRef, useState } from "react";
import { Gauge, MousePointer2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const isTouchDevice = () => window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;

const readPreference = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writePreference = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The animation still works when private browsing blocks storage.
  }
};

export const AmbientMotion = () => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>();
  const [isTouch, setIsTouch] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [speed, setSpeed] = useState(5);

  useEffect(() => {
    const touch = isTouchDevice();
    const savedEnabled = readPreference(`ambient-enabled-${touch ? "touch" : "desktop"}`);
    const savedSpeed = Number(readPreference("ambient-speed"));
    setIsTouch(touch);
    setEnabled(savedEnabled === null ? touch : savedEnabled === "true");
    if (Number.isFinite(savedSpeed) && savedSpeed >= 1 && savedSpeed <= 10) setSpeed(savedSpeed);
  }, []);

  useEffect(() => {
    writePreference(`ambient-enabled-${isTouch ? "touch" : "desktop"}`, String(enabled));
  }, [enabled, isTouch]);

  useEffect(() => {
    writePreference("ambient-speed", String(speed));
  }, [speed]);

  useEffect(() => {
    if (!enabled || isTouch) return;

    const onPointerMove = (event: PointerEvent) => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        fieldRef.current?.style.setProperty("--pointer-x", `${x * speed * 3}px`);
        fieldRef.current?.style.setProperty("--pointer-y", `${y * speed * 3}px`);
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    };
  }, [enabled, isTouch, speed]);

  return (
    <>
      <div
        ref={fieldRef}
        className={`ambient-field ${enabled ? (isTouch ? "ambient-auto" : "ambient-pointer") : "ambient-paused"}`}
        style={{ "--ambient-duration": `${Math.max(7, 24 - speed * 1.6)}s` } as React.CSSProperties}
        aria-hidden="true"
      >
        <span className="ambient-orb ambient-orb-one" />
        <span className="ambient-orb ambient-orb-two" />
        <span className="ambient-orb ambient-orb-three" />
      </div>

      <aside className="glass-panel motion-control" aria-label="Настройки движения фона">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="motion-icon" aria-hidden="true">
              <MousePointer2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-xs font-bold">Живой фон</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {isTouch ? "Автодвижение" : "Следует за мышью"}
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Включить движение фона" />
        </div>

        <div className={`mt-4 transition-opacity ${enabled ? "opacity-100" : "pointer-events-none opacity-40"}`}>
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Скорость</span>
            <span>{speed}/10</span>
          </div>
          <Slider
            value={[speed]}
            min={1}
            max={10}
            step={1}
            disabled={!enabled}
            onValueChange={(value) => setSpeed(value[0] ?? 5)}
            aria-label="Скорость движения фона"
          />
        </div>
      </aside>
    </>
  );
};