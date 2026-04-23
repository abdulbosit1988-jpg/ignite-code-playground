import { useEffect, useRef, useState } from "react";
import { Play, Loader2, ExternalLink, ChevronDown } from "lucide-react";
import { LangKey } from "@/lib/languages";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useUserSettings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

declare global { interface Window { loadPyodide?: any; pyodide?: any; } }

interface Props { code: string; language: LangKey; onPythonRun?: () => void; }

const buildHtml = (code: string, language: LangKey) => {
  if (language === "html") return code;
  if (language === "css") return `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>Preview</h1><p>Sample paragraph styled with your CSS.</p><button>Button</button></body></html>`;
  return `<!DOCTYPE html><html><head><style>body{background:#0f172a;color:#fff;font-family:monospace;padding:1rem}</style></head><body><pre id="out"></pre><script>
    const out = document.getElementById('out');
    const log = (...a) => out.textContent += a.join(' ') + '\\n';
    const origLog = console.log; console.log = (...a) => { log(...a); origLog(...a); };
    const origErr = console.error; console.error = (...a) => { log('Error:', ...a); origErr(...a); };
    try { ${code} } catch(e) { log('Error:', e.message); }
  </script></body></html>`;
};

export const RunnerPanel = ({ code, language, onPythonRun }: Props) => {
  const { settings } = useSettings();
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [pyLoading, setPyLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const openInNewTab = (html: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const runWeb = (mode: "inline" | "newtab") => {
    const html = buildHtml(code, language);
    if (mode === "newtab") openInNewTab(html);
    else if (iframeRef.current) iframeRef.current.srcdoc = html;
    setOutput("");
  };

  const loadPy = async () => {
    if (window.pyodide) return window.pyodide;
    setPyLoading(true);
    if (!window.loadPyodide) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
        s.onload = () => res(); s.onerror = () => rej(new Error("Не удалось загрузить Pyodide"));
        document.body.appendChild(s);
      });
    }
    window.pyodide = await window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
    await window.pyodide.loadPackage(["micropip"]);
    setPyLoading(false);
    return window.pyodide;
  };

  // Auto-install missing packages from import statements
  const ensurePackages = async (py: any, src: string) => {
    const matches = [...src.matchAll(/^\s*(?:import|from)\s+([a-zA-Z0-9_]+)/gm)].map((m) => m[1]);
    const builtins = new Set(["sys","os","math","random","time","datetime","json","re","collections","itertools","functools","io","string","typing","__future__","statistics","decimal","copy","pathlib","urllib","base64","hashlib","csv"]);
    const aliasMap: Record<string,string> = { cv2: "opencv-python", PIL: "pillow", sklearn: "scikit-learn", bs4: "beautifulsoup4" };
    const wanted = [...new Set(matches.filter((m) => !builtins.has(m)))];
    if (!wanted.length) return;
    const micropip = py.pyimport("micropip");
    for (const m of wanted) {
      const pkg = aliasMap[m] || m;
      try { await micropip.install(pkg); } catch { /* skip */ }
    }
  };

  const runPython = async (mode: "inline" | "newtab") => {
    if (mode === "newtab") {
      // Run in new tab via standalone Pyodide page
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Python Run</title>
        <style>body{background:#0f172a;color:#fff;font-family:ui-monospace,monospace;padding:1rem;margin:0}pre{white-space:pre-wrap}</style>
        <script src="https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js"></script>
        </head><body><pre id="out">Загружаю Python...</pre><script>
        (async () => {
          const out = document.getElementById('out'); out.textContent = '';
          const py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
          await py.loadPackage(['micropip']);
          py.setStdout({ batched: (s) => out.textContent += s + '\\n' });
          py.setStderr({ batched: (s) => out.textContent += s + '\\n' });
          const src = ${JSON.stringify(code)};
          const matches = [...src.matchAll(/^\\s*(?:import|from)\\s+([a-zA-Z0-9_]+)/gm)].map(m => m[1]);
          const builtins = new Set(['sys','os','math','random','time','datetime','json','re','collections','itertools','functools','io','string','typing','statistics','decimal','copy','pathlib','urllib','base64','hashlib','csv']);
          const alias = { cv2:'opencv-python', PIL:'pillow', sklearn:'scikit-learn', bs4:'beautifulsoup4' };
          const wanted = [...new Set(matches.filter(m => !builtins.has(m)))];
          const mp = py.pyimport('micropip');
          for (const m of wanted) { try { await mp.install(alias[m]||m); } catch(e){} }
          try { await py.runPythonAsync(src); } catch(e) { out.textContent += '\\n' + e.message; }
        })();
        </script></body></html>`;
      openInNewTab(html);
      return;
    }
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
    } finally { setRunning(false); }
  };

  const runStaticHint = () => {
    setOutput(`Запуск ${language} в браузере не поддерживается.\nКод сохранён — открой файл локально для запуска.\n\nПример вывода (заглушка):\nHello, World!`);
  };

  const run = (mode: "inline" | "newtab" = settings.run_mode) => {
    if (language === "html" || language === "css" || language === "javascript") runWeb(mode);
    else if (language === "python") { onPythonRun?.(); runPython(mode); }
    else runStaticHint();
  };

  const isWeb = language === "html" || language === "css" || language === "javascript";
  const isRunnable = isWeb || language === "python";

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">Output</span>
        <div className="flex items-center">
          <Button size="sm" onClick={() => run()} disabled={running || pyLoading} className="rounded-r-none">
            {(running || pyLoading) ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> :
              settings.run_mode === "newtab" ? <ExternalLink className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            Run
          </Button>
          {isRunnable && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" className="rounded-l-none border-l border-primary-foreground/20 px-2"><ChevronDown className="w-3 h-3" /></Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                <button onClick={() => run("inline")} className="w-full flex items-center gap-2 p-2 hover:bg-secondary rounded text-sm"><Play className="w-4 h-4" />На сайте</button>
                <button onClick={() => run("newtab")} className="w-full flex items-center gap-2 p-2 hover:bg-secondary rounded text-sm"><ExternalLink className="w-4 h-4" />Новая вкладка</button>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      {isWeb && settings.run_mode === "inline" ? (
        <iframe ref={iframeRef} title="preview" className="flex-1 bg-white" sandbox="allow-scripts" />
      ) : (
        <pre className="flex-1 p-3 overflow-auto font-mono text-sm whitespace-pre-wrap text-foreground/90">{output || "Нажми Run для запуска"}</pre>
      )}
    </div>
  );
};
