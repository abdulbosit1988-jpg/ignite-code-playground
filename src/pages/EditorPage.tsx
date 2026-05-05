import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor, { OnMount } from "@monaco-editor/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LANGUAGES, EDITOR_THEMES, LangKey } from "@/lib/languages";
import { Button } from "@/components/ui/button";
import { TerminalPanel } from "@/components/TerminalPanel";
import { RunnerPanel } from "@/components/RunnerPanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft, Save, Terminal as TermIcon, Pipette, Wand2,
  ZoomIn, ZoomOut, Users, Loader2, Sparkles, Play, Link as LinkIcon,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { registerSnippets } from "@/lib/editorSnippets";
import { registerAiCompletions } from "@/lib/aiCompletions";
import { buildPreviewHtml, openPreviewInNewTab } from "@/lib/runnerPreview";

const Editor_ = () => {
  const { id, code: invite } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const monacoRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const [project, setProject] = useState<any>(null);
  const [code, setCode] = useState("");
  const [theme, setTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [showTerm, setShowTerm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collaborators, setCollaborators] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiAsk, setAiAsk] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [runSignal, setRunSignal] = useState(0);
  const isShared = !!invite;
  const saveTimerRef = useRef<number | null>(null);
  const lastSentCodeRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const remoteUpdate = useRef(false);
  const switchingTabRef = useRef(false);

  // HTML Project multi-file state
  const [activeTab, setActiveTab] = useState<"html" | "css" | "js">("html");
  const activeTabRef = useRef<"html" | "css" | "js">("html");
  const [linkedCss, setLinkedCss] = useState("");
  const [linkedJs, setLinkedJs] = useState("");
  const initialLoadDone = useRef(false);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // Load project
  useEffect(() => {
    (async () => {
      let projectId = id;
      let ownerId = user?.id;
      if (isShared) {
        const { data: oid } = await supabase.rpc("find_user_by_invite", { _code: invite });
        if (!oid) { toast.error("Код не найден"); nav("/dashboard"); return; }
        ownerId = oid as unknown as string;
        const { data: p } = await supabase.from("projects").select("*").eq("user_id", ownerId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (!p) { toast.error("У владельца нет проектов"); nav("/dashboard"); return; }
        setProject(p); setCode(p.code); setTheme(p.theme); projectId = p.id;
      } else {
        const { data, error } = await supabase.from("projects").select("*").eq("id", projectId!).maybeSingle();
        if (error || !data) { toast.error("Проект не найден"); nav("/dashboard"); return; }
        setProject(data); setCode(data.code); setTheme(data.theme);
      }

      // Realtime channel
      const ch = supabase.channel(`project:${projectId}`, { config: { presence: { key: user?.id || "anon" } } });
      ch.on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${projectId}` }, (payload) => {
        const newCode = (payload.new as any).code;
        if (newCode === undefined) return;
        // Ignore echo of our own save
        if (newCode === lastSentCodeRef.current) return;
        // Always keep latest html in state
        setCode(newCode);
        // Only patch the editor if user is currently viewing the HTML tab
        const ed = editorRef.current;
        if (!ed || activeTabRef.current !== "html") return;
        if (newCode === ed.getValue()) return;

        // Smart diff-apply: only change lines that differ so cursor stays in place
        const model = ed.getModel();
        const oldLines = model.getLinesContent() as string[];
        const newLines = newCode.split("\n");
        const edits: any[] = [];

        const maxLen = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLen; i++) {
          const oldLine = oldLines[i];
          const newLine = newLines[i];
          if (oldLine === undefined) {
            edits.push({
              range: { startLineNumber: oldLines.length, endLineNumber: oldLines.length, startColumn: (oldLines[oldLines.length - 1] || "").length + 1, endColumn: (oldLines[oldLines.length - 1] || "").length + 1 },
              text: "\n" + newLines.slice(oldLines.length).join("\n"),
            });
            break;
          } else if (newLine === undefined) {
            edits.push({
              range: { startLineNumber: i + 1, endLineNumber: oldLines.length, startColumn: 1, endColumn: (oldLines[oldLines.length - 1] || "").length + 1 },
              text: "",
            });
            break;
          } else if (oldLine !== newLine) {
            edits.push({
              range: { startLineNumber: i + 1, endLineNumber: i + 1, startColumn: 1, endColumn: oldLine.length + 1 },
              text: newLine,
            });
          }
        }

        if (edits.length > 0) {
          const savedPos = ed.getPosition();
          const savedSel = ed.getSelection();
          remoteUpdate.current = true;
          ed.executeEdits("remote", edits);
          if (savedPos) ed.setPosition(savedPos);
          if (savedSel) ed.setSelection(savedSel);
        }
      });
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        setCollaborators(Object.keys(state).length);
      });
      ch.subscribe((status) => { if (status === "SUBSCRIBED") ch.track({ at: Date.now() }); });
      channelRef.current = ch;
    })();
    return () => { channelRef.current && supabase.removeChannel(channelRef.current); };
  // eslint-disable-next-line
  }, [id, invite]);

  // Auto-save (debounced)
  const saveCode = useCallback(async (val: string, themeOverride?: string) => {
    if (!project) return;
    setSaving(true);
    if (activeTab === "html") {
      lastSentCodeRef.current = val;
      await supabase.from("projects").update({ code: val, theme: themeOverride || theme }).eq("id", project.id);
    } else {
      const ext = activeTab === "css" ? ".css" : ".js";
      const fileName = project.name.replace(/\.(html?|css|js|py)$/i, "") + ext;
      const { data: existing } = await supabase.from("files").select("id").eq("user_id", project.user_id).eq("name", fileName).maybeSingle();
      if (existing) {
        await supabase.from("files").update({ content: val, language: activeTab, mime: activeTab === "css" ? "text/css" : "application/javascript" }).eq("id", existing.id);
      } else {
        await supabase.from("files").insert({
          user_id: project.user_id,
          name: fileName,
          content: val,
          kind: "file",
          language: activeTab,
          mime: activeTab === "css" ? "text/css" : "application/javascript",
        });
      }
      if (activeTab === "css") setLinkedCss(val);
      else setLinkedJs(val);
    }
    setSaving(false);
  }, [project, theme, activeTab]);

  useEffect(() => {
    if (!project) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const val = editorRef.current?.getValue();
      if (val !== undefined) saveCode(val);
    }, 1800);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [code, linkedCss, linkedJs, project, saveCode]);

  useEffect(() => {
    if (!project || project.language !== "html" || isShared) return;
    (async () => {
      const baseName = project.name.replace(/\.html?$/i, "");
      const cssName = baseName + ".css";
      const jsName = baseName + ".js";

      const { data: files } = await supabase.from("files").select("name, content").eq("user_id", project.user_id).in("name", [cssName, jsName]);
      const css = files?.find(f => f.name === cssName)?.content || "";
      const js = files?.find(f => f.name === jsName)?.content || "";
      setLinkedCss(css);
      setLinkedJs(js);
      initialLoadDone.current = true;
    })();
  }, [project, isShared]);

  const switchTab = (tab: "html" | "css" | "js") => {
    if (tab === activeTab) return;
    // Save current before switching (use current tab via ref to avoid stale closure)
    const cur = editorRef.current?.getValue() ?? "";
    if (activeTabRef.current === "html") setCode(cur);
    else if (activeTabRef.current === "css") setLinkedCss(cur);
    else setLinkedJs(cur);
    saveCode(cur);

    activeTabRef.current = tab;
    setActiveTab(tab);
    const newVal = tab === "html" ? code : tab === "css" ? linkedCss : linkedJs;
    switchingTabRef.current = true;
    editorRef.current?.setValue(newVal);
    setTimeout(() => { switchingTabRef.current = false; }, 0);
  };

  const handleRun = useCallback(() => {
    if (!project) return;
    if (project.language === "python") {
      setShowTerm(true);
      setRunSignal((v) => v + 1);
      return;
    }

    const currentCode = activeTab === "html" ? editorRef.current?.getValue() : code;
    const currentCss = activeTab === "css" ? editorRef.current?.getValue() : linkedCss;
    const currentJs = activeTab === "js" ? editorRef.current?.getValue() : linkedJs;

    const html = buildPreviewHtml(currentCode, project.language as LangKey, currentCss);
    // Inject JS into preview if exists
    const finalHtml = currentJs ? html.replace("</body>", `<script>${currentJs}</script></body>`) : html;
    openPreviewInNewTab(finalHtml);
  }, [project, code, linkedCss, linkedJs, activeTab]);

  const editorLanguage = useMemo(() => {
    if (activeTab === "css") return "css";
    if (activeTab === "js") return "javascript";
    if (project?.language === "javascript") return "javascript";
    return project?.language;
  }, [project?.language, activeTab]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // Custom themes
    monaco.editor.defineTheme("dracula", {
      base: "vs-dark", inherit: true,
      rules: [{ token: "comment", foreground: "6272a4" }, { token: "string", foreground: "f1fa8c" }, { token: "keyword", foreground: "ff79c6" }],
      colors: { "editor.background": "#282a36", "editor.foreground": "#f8f8f2" },
    });
    monaco.editor.defineTheme("monokai", {
      base: "vs-dark", inherit: true,
      rules: [{ token: "comment", foreground: "75715e" }, { token: "string", foreground: "e6db74" }, { token: "keyword", foreground: "f92672" }],
      colors: { "editor.background": "#272822", "editor.foreground": "#f8f8f2" },
    });
    monaco.editor.defineTheme("github-dark", {
      base: "vs-dark", inherit: true,
      rules: [{ token: "comment", foreground: "8b949e" }, { token: "string", foreground: "a5d6ff" }, { token: "keyword", foreground: "ff7b72" }],
      colors: { "editor.background": "#0d1117", "editor.foreground": "#c9d1d9" },
    });
    monaco.editor.defineTheme("solarized", {
      base: "vs-dark", inherit: true,
      rules: [{ token: "comment", foreground: "586e75" }, { token: "string", foreground: "2aa198" }, { token: "keyword", foreground: "859900" }],
      colors: { "editor.background": "#002b36", "editor.foreground": "#839496" },
    });
    monaco.editor.setTheme(theme);

    // Register code snippets / completions for HTML and Python
    registerSnippets(monaco);
    // Register AI inline completions (Copilot-like)
    registerAiCompletions(monaco, () => (project?.language as LangKey) || "python");

    // Ctrl/Cmd + scroll = font size
    const dom = editor.getDomNode();
    dom?.addEventListener("wheel", (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setFontSize((f) => Math.max(8, Math.min(40, f + (e.deltaY < 0 ? 1 : -1))));
      }
    }, { passive: false });
  };

  useEffect(() => { monacoRef.current?.editor.setTheme(theme); }, [theme]);

  const autoTheme = () => {
    const t = EDITOR_THEMES[Math.floor(Math.random() * EDITOR_THEMES.length)].key;
    setTheme(t); saveCode(code, t);
    toast.success(`Тема: ${t}`);
  };

  const callAi = async (mode: "fix" | "generate" | "explain" | "ask", instruction = "") => {
    if (!project) return;
    setAiBusy(true);
    const tId = toast.loading(
      mode === "fix" ? "ИИ исправляет код..." :
      mode === "generate" ? "ИИ пишет код..." :
      mode === "ask" ? "ИИ думает..." :
      "ИИ анализирует..."
    );
    try {
      // Use code from the currently active editor (html/css/js tab)
      const currentCode = editorRef.current?.getValue() ?? code;
      const lang = activeTab === "css" ? "css" : activeTab === "js" ? "javascript" : project.language;
      const { data, error } = await supabase.functions.invoke("ai-fix", {
        body: { code: currentCode, language: lang, mode, instruction },
      });
      toast.dismiss(tId);
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Ошибка ИИ");
        return;
      }
      const result = (data as any).result as string;
      if (mode === "explain" || mode === "ask") {
        setAiAnswer(result);
      } else {
        // Apply result to the active tab
        if (activeTab === "html") setCode(result);
        else if (activeTab === "css") setLinkedCss(result);
        else setLinkedJs(result);
        editorRef.current?.setValue(result);
        toast.success(mode === "fix" ? "Код исправлен ✨" : "Код сгенерирован ✨");
      }
    } catch (e: any) {
      toast.dismiss(tId);
      toast.error(e.message || "Ошибка");
    } finally { setAiBusy(false); }
  };

  const lconf = LANGUAGES.find((l) => l.key === project?.language);

  if (!project) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border flex items-center px-2 sm:px-3 h-12 gap-1 sm:gap-2 shrink-0 overflow-x-auto" style={{ background: `hsl(var(--navbar) / 0.95)` }}>
        <Button variant="ghost" size="icon" onClick={() => nav("/dashboard")}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-border mr-1">
          <Code2 className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm hidden sm:inline">Online Coding</span>
        </div>
        <span className="text-xl shrink-0">{lconf?.icon}</span>
        <div className="flex-1 min-w-0 hidden sm:block">
          <p className="font-medium truncate text-sm">{project.name}{isShared && " (shared)"}</p>
          <p className="text-xs text-muted-foreground">{lconf?.name} · {saving ? "сохранение..." : "сохранено"}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" title="Пипетка — сменить тему"><Pipette className="w-4 h-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <p className="text-xs font-medium mb-2">Цветовая тема</p>
              <div className="grid grid-cols-3 gap-2">
                {EDITOR_THEMES.map((t) => (
                  <button key={t.key} onClick={() => { setTheme(t.key); saveCode(code, t.key); }}
                    className={`h-12 rounded border-2 ${theme === t.key ? "border-primary" : "border-border"}`}
                    style={{ background: t.color }} title={t.name} />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={autoTheme} title="Автоматическая тема"><Wand2 className="w-4 h-4" /></Button>

          {/* AI assistant */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" disabled={aiBusy} title="ИИ-ассистент">
                {aiBusy ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Sparkles className="w-4 h-4 text-primary" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-2 max-h-[80vh] overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ИИ-помощник ({lconf?.name})</p>
              <Button size="sm" variant="secondary" className="w-full justify-start" disabled={aiBusy} onClick={() => callAi("fix")}>
                <Sparkles className="w-3 h-3 mr-2" />Исправить ошибки
              </Button>
              <Button size="sm" variant="secondary" className="w-full justify-start" disabled={aiBusy} onClick={() => callAi("explain")}>
                <Wand2 className="w-3 h-3 mr-2" />Объяснить код
              </Button>
              <div className="space-y-1 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground">Сгенерировать код по заданию:</p>
                <Textarea value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} placeholder="Напиши функцию, которая..." className="text-xs min-h-[60px]" />
                <Button size="sm" className="w-full" disabled={aiBusy || !aiInstruction.trim()} onClick={() => { callAi("generate", aiInstruction); setAiInstruction(""); }}>
                  Сгенерировать
                </Button>
              </div>
              <div className="space-y-1 pt-1 border-t border-border">
                <p className="text-xs text-muted-foreground">Спросить ИИ о чём угодно:</p>
                <Textarea value={aiAsk} onChange={(e) => setAiAsk(e.target.value)} placeholder="Как работает useEffect? / Что такое async?..." className="text-xs min-h-[60px]" />
                <Button size="sm" variant="default" className="w-full" disabled={aiBusy || !aiAsk.trim()} onClick={() => { callAi("ask", aiAsk); setAiAsk(""); }}>
                  Спросить
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={!!aiAnswer} onOpenChange={(o) => !o && setAiAnswer("")}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Ответ ИИ</DialogTitle></DialogHeader>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{aiAnswer}</div>
            </DialogContent>
          </Dialog>

          <div className="hidden md:flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setFontSize((f) => Math.max(8, f - 1))} title="Уменьшить"><ZoomOut className="w-4 h-4" /></Button>
            <span className="text-xs w-8 text-center">{fontSize}</span>
            <Button variant="ghost" size="icon" onClick={() => setFontSize((f) => Math.min(40, f + 1))} title="Увеличить"><ZoomIn className="w-4 h-4" /></Button>
          </div>

          <Button variant="default" size="sm" onClick={handleRun}><Play className="w-4 h-4 mr-1" />Run</Button>
          <Button variant={showTerm ? "default" : "ghost"} size="icon" onClick={() => setShowTerm((s) => !s)} title={showTerm ? "Скрыть терминал" : "Показать терминал"}><TermIcon className="w-4 h-4" /></Button>

          <div className="hidden sm:flex items-center gap-1 px-2 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /> {collaborators}
          </div>
          {project.language === "html" && (
            <Button variant="outline" size="sm" onClick={() => {
              const url = `${window.location.origin}/site/${project.name}`;
              navigator.clipboard.writeText(url);
              toast.success("Ссылка на сайт скопирована!");
            }}>
              <LinkIcon className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Ссылка</span>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => saveCode(editorRef.current?.getValue() || "")}><Save className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Save</span></Button>
        </div>
      </header>

      {project.language === "html" && (
        <div className="flex bg-secondary/30 border-b border-border h-9 px-4 items-center gap-4">
          <button onClick={() => switchTab("html")} className={`text-xs font-mono px-3 h-full transition-colors ${activeTab === "html" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>index.html</button>
          <button onClick={() => switchTab("css")} className={`text-xs font-mono px-3 h-full transition-colors ${activeTab === "css" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>style.css</button>
          <button onClick={() => switchTab("js")} className={`text-xs font-mono px-3 h-full transition-colors ${activeTab === "js" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>script.js</button>
        </div>
      )}

       <div className="flex-1 flex flex-col overflow-hidden">
         <div className="flex-1 min-h-[40vh]">
          <Editor
            height="100%"
            language={editorLanguage}
            defaultValue={code}
            onChange={(v) => {
              if (switchingTabRef.current || remoteUpdate.current) { remoteUpdate.current = false; return; }
              const val = v ?? "";
              const t = activeTabRef.current;
              if (t === "html") setCode(val);
              else if (t === "css") setLinkedCss(val);
              else setLinkedJs(val);
            }}
            onMount={handleMount}
            options={{
              fontSize, fontFamily: "JetBrains Mono, monospace",
              minimap: { enabled: true }, automaticLayout: true,
              tabSize: 2, wordWrap: "on", smoothScrolling: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: { other: true, comments: false, strings: true },
              tabCompletion: "on", acceptSuggestionOnEnter: "on",
              snippetSuggestions: "top", suggestSelection: "first",
              wordBasedSuggestions: "currentDocument" as any,
              parameterHints: { enabled: true },
              autoClosingBrackets: "always", autoClosingQuotes: "always",
              autoIndent: "full", formatOnPaste: true, formatOnType: true,
              cursorBlinking: "smooth", padding: { top: 12 },
              inlineSuggest: { enabled: true, mode: "subword" as any },
            }}
          />
         </div>
         {showTerm && (
           <div className="h-[42svh] min-h-[260px] border-t border-border">
             <div className="h-1/2 border-b border-border">
               <RunnerPanel code={code} language={project.language as LangKey} onPythonRun={() => setShowTerm(true)} runSignal={runSignal} />
             </div>
             <div className="h-1/2">
               <TerminalPanel onClose={() => setShowTerm(false)} />
             </div>
           </div>
         )}
         </div>
    </div>
  );
};

export default Editor_;
