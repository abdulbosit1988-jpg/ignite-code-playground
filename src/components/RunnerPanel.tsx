import { useEffect, useRef, useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { LangKey } from "@/lib/languages";
import { Button } from "@/components/ui/button";

declare global { interface Window { loadPyodide?: any; pyodide?: any; } }

interface Props { code: string; language: LangKey; }

export const RunnerPanel = ({ code, language }: Props) => {
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [pyLoading, setPyLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const runWeb = () => {
    const html = language === "html" ? code
      : language === "css" ? `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>Preview</h1><p>Sample paragraph styled with your CSS.</p><button>Button</button></body></html>`
      : `<!DOCTYPE html><html><head><style>body{background:#0f172a;color:#fff;font-family:monospace;padding:1rem}</style></head><body><pre id="out"></pre><script>
        const out = document.getElementById('out');
        const log = (...a) => out.textContent += a.join(' ') + '\\n';
        const origLog = console.log; console.log = (...a) => { log(...a); origLog(...a); };
        const origErr = console.error; console.error = (...a) => { log('Error:', ...a); origErr(...a); };
        try { ${code} } catch(e) { log('Error:', e.message); }
      </script></body></html>`;
    if (iframeRef.current) iframeRef.current.srcdoc = html;
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
    setPyLoading(false);
    return window.pyodide;
  };

  const runPython = async () => {
    setRunning(true);
    setOutput("Загружаю Python (первый раз ~5 сек)...\n");
    try {
      const py = await loadPy();
      let buf = "";
      py.setStdout({ batched: (s: string) => { buf += s + "\n"; setOutput(buf); } });
      py.setStderr({ batched: (s: string) => { buf += s + "\n"; setOutput(buf); } });
      await py.runPythonAsync(code);
      if (!buf) setOutput("(нет вывода)");
    } catch (e: any) {
      setOutput((o) => o + `\n${e.message}`);
    } finally { setRunning(false); }
  };

  const runStaticHint = () => {
    setOutput(`Запуск ${language} в браузере не поддерживается.\nКод сохранён — открой файл локально для запуска.\n\nПример вывода (заглушка):\nHello, World!`);
  };

  const run = () => {
    if (language === "html" || language === "css" || language === "javascript") runWeb();
    else if (language === "python") runPython();
    else runStaticHint();
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span>Output</span>
        </div>
        <Button size="sm" onClick={run} disabled={running || pyLoading}>
          {(running || pyLoading) ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
          Run
        </Button>
      </div>
      {(language === "html" || language === "css" || language === "javascript") ? (
        <iframe ref={iframeRef} title="preview" className="flex-1 bg-white" sandbox="allow-scripts" />
      ) : (
        <pre className="flex-1 p-3 overflow-auto font-mono text-sm whitespace-pre-wrap text-foreground/90">{output || "Нажми Run для запуска"}</pre>
      )}
    </div>
  );
};
