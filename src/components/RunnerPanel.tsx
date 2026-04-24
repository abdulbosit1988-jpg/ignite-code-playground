import { useEffect, useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { LangKey } from "@/lib/languages";
import { Button } from "@/components/ui/button";
declare global { interface Window { loadPyodide?: any; pyodide?: any; } }

interface Props { code: string; language: LangKey; onPythonRun?: () => void; runSignal?: number; }

export const RunnerPanel = ({ code, language, onPythonRun, runSignal = 0 }: Props) => {
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [pyLoading, setPyLoading] = useState(false);

  const loadPy = async () => {
    if (window.pyodide) return window.pyodide;
    setPyLoading(true);
    if (!window.loadPyodide) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
        s.onload = () => res();
        s.onerror = () => rej(new Error("Не удалось загрузить Pyodide"));
        document.body.appendChild(s);
      });
    }
    window.pyodide = await window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
    await window.pyodide.loadPackage(["micropip"]);
    setPyLoading(false);
    return window.pyodide;
  };

  const ensurePackages = async (py: any, src: string) => {
    const matches = [...src.matchAll(/^\s*(?:import|from)\s+([a-zA-Z0-9_]+)/gm)].map((m) => m[1]);
    const builtins = new Set(["sys", "os", "math", "random", "time", "datetime", "json", "re", "collections", "itertools", "functools", "io", "string", "typing", "__future__", "statistics", "decimal", "copy", "pathlib", "urllib", "base64", "hashlib", "csv", "asyncio", "dataclasses"]);
    const aliasMap: Record<string, string> = { cv2: "opencv-python", PIL: "pillow", sklearn: "scikit-learn", bs4: "beautifulsoup4" };
    const wanted = [...new Set(matches.filter((m) => !builtins.has(m)))];
    if (!wanted.length) return;
    const micropip = py.pyimport("micropip");
    for (const m of wanted) {
      const pkg = aliasMap[m] || m;
      try { await micropip.install(pkg); } catch { }
    }
  };

  const runPython = async () => {
    setRunning(true);
    setOutput("Загружаю Python (первый раз ~5 сек)...\n");
    try {
      const py = await loadPy();
      let buf = "";
      py.setStdout({ batched: (s: string) => { buf += s + "\n"; setOutput(buf); } });
      py.setStderr({ batched: (s: string) => { buf += s + "\n"; setOutput(buf); } });
      setOutput("Устанавливаю зависимости (если нужно)...\n");
      await ensurePackages(py, code);
      buf = "";
      await py.runPythonAsync(code);
      if (!buf) setOutput("(нет вывода)");
    } catch (e: any) {
      setOutput((o) => o + `\n${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const runStaticHint = () => {
    setOutput(`Запуск ${language} в этой панели не поддерживается.\nИспользуй верхнюю кнопку Run.`);
  };

  const run = () => {
    if (language === "python") {
      onPythonRun?.();
      runPython();
      return;
    }
    runStaticHint();
  };

  useEffect(() => {
    if (runSignal > 0 && language === "python") run();
  }, [runSignal]);

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">Output</span>
        <Button size="sm" onClick={run} disabled={running || pyLoading || language !== "python"}>
          {(running || pyLoading) ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
          Run
        </Button>
      </div>
      <pre className="flex-1 p-3 overflow-auto font-mono text-sm whitespace-pre-wrap text-foreground/90">{output || "Нажми Run для запуска"}</pre>
    </div>
  );
};
