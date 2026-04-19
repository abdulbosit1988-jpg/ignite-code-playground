import { useEffect, useRef, useState } from "react";
import { Terminal as TermIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Line { type: "in" | "out" | "err"; text: string; }

export const TerminalPanel = ({ onClose }: { onClose: () => void }) => {
  const [lines, setLines] = useState<Line[]>([
    { type: "out", text: "Online Coding Terminal v1.0 — введите 'help' для списка команд" },
  ]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState("/home/user");
  const [history, setHistory] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const fs = useRef<Record<string, string[]>>({ "/home/user": ["projects", "readme.txt"], "/home/user/projects": [], "/": ["home", "etc", "tmp"] });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const run = (cmd: string) => {
    const out: Line[] = [{ type: "in", text: `${cwd} $ ${cmd}` }];
    const [c, ...args] = cmd.trim().split(/\s+/);
    switch (c) {
      case "":
        break;
      case "help":
        out.push({ type: "out", text: "help, ls, cd, pwd, echo, clear, mkdir, touch, cat, whoami, date, neofetch" });
        break;
      case "ls": {
        const list = fs.current[cwd] || [];
        out.push({ type: "out", text: list.join("  ") || "(empty)" });
        break;
      }
      case "pwd": out.push({ type: "out", text: cwd }); break;
      case "cd": {
        const target = args[0] || "/home/user";
        const next = target.startsWith("/") ? target : `${cwd}/${target}`.replace(/\/+/g, "/");
        if (fs.current[next] !== undefined) setCwd(next);
        else if (target === "..") setCwd(cwd.split("/").slice(0, -1).join("/") || "/");
        else out.push({ type: "err", text: `cd: ${target}: No such directory` });
        break;
      }
      case "echo": out.push({ type: "out", text: args.join(" ") }); break;
      case "clear": setLines([]); return;
      case "mkdir": {
        const name = args[0];
        if (!name) { out.push({ type: "err", text: "mkdir: missing operand" }); break; }
        fs.current[cwd] = [...(fs.current[cwd] || []), name];
        fs.current[`${cwd}/${name}`.replace(/\/+/g, "/")] = [];
        out.push({ type: "out", text: `Created '${name}'` });
        break;
      }
      case "touch": {
        const name = args[0];
        if (!name) { out.push({ type: "err", text: "touch: missing operand" }); break; }
        fs.current[cwd] = [...(fs.current[cwd] || []), name];
        out.push({ type: "out", text: `Touched '${name}'` });
        break;
      }
      case "cat": out.push({ type: "out", text: args[0] === "readme.txt" ? "Welcome to Online Coding!" : `cat: ${args[0]}: No such file` }); break;
      case "whoami": out.push({ type: "out", text: "developer" }); break;
      case "date": out.push({ type: "out", text: new Date().toString() }); break;
      case "neofetch":
        out.push({ type: "out", text: "    OS: Online Coding Linux\n  Host: lovable.app\n Shell: ocsh 1.0\n  CPU: WebAssembly\n   RAM: ∞" });
        break;
      default:
        out.push({ type: "err", text: `${c}: command not found` });
    }
    setLines((l) => [...l, ...out]);
    setHistory((h) => [cmd, ...h].slice(0, 50));
    setHi(-1);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { run(input); setInput(""); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      const ni = Math.min(hi + 1, history.length - 1);
      setHi(ni); if (history[ni] !== undefined) setInput(history[ni]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const ni = Math.max(hi - 1, -1);
      setHi(ni); setInput(ni === -1 ? "" : history[ni] || "");
    }
  };

  return (
    <div className="bg-terminal border-t border-border flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2 text-sm"><TermIcon className="w-4 h-4 text-primary" /><span className="font-medium">Terminal</span></div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <div className="flex-1 overflow-auto p-3 font-mono text-sm" onClick={() => (document.getElementById("term-input") as HTMLInputElement)?.focus()}>
        {lines.map((l, i) => (
          <div key={i} className={l.type === "err" ? "text-destructive" : l.type === "in" ? "text-primary" : "text-foreground/90"}>
            <pre className="whitespace-pre-wrap">{l.text}</pre>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-primary">{cwd} $</span>
          <input id="term-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
            className="flex-1 bg-transparent outline-none text-foreground" autoFocus />
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
};
