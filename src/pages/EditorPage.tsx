import { useEffect, useRef, useState, useCallback } from "react";
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
  ZoomIn, ZoomOut, Users, Loader2, Globe,
} from "lucide-react";
import { toast } from "sonner";

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
  const remoteUpdate = useRef(false);
  const channelRef = useRef<any>(null);
  const isShared = !!invite;

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
        if (newCode !== undefined && newCode !== editorRef.current?.getValue()) {
          remoteUpdate.current = true;
          setCode(newCode);
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
    await supabase.from("projects").update({ code: val, theme: themeOverride || theme }).eq("id", project.id);
    setSaving(false);
  }, [project, theme]);

  useEffect(() => {
    if (!project || remoteUpdate.current) { remoteUpdate.current = false; return; }
    const t = setTimeout(() => saveCode(code), 800);
    return () => clearTimeout(t);
  }, [code, project, saveCode]);

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

    // Ctrl/Cmd + scroll = font size
    editor.onMouseWheel?.((e: any) => {
      if (e.event.ctrlKey || e.event.metaKey) {
        e.event.preventDefault?.();
        setFontSize((f) => Math.max(8, Math.min(40, f + (e.event.deltaY < 0 ? 1 : -1))));
      }
    });
  };

  useEffect(() => { monacoRef.current?.editor.setTheme(theme); }, [theme]);

  const autoTheme = () => {
    const t = EDITOR_THEMES[Math.floor(Math.random() * EDITOR_THEMES.length)].key;
    setTheme(t); saveCode(code, t);
    toast.success(`Тема: ${t}`);
  };

  const lconf = LANGUAGES.find((l) => l.key === project?.language);

  if (!project) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border glass flex items-center px-3 h-12 gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => nav("/dashboard")}><ArrowLeft className="w-4 h-4" /></Button>
        <span className="text-2xl">{lconf?.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{project.name}{isShared && " (shared)"}</p>
          <p className="text-xs text-muted-foreground">{lconf?.name} · {saving ? "сохранение..." : "сохранено"}</p>
        </div>

        <div className="flex items-center gap-1">
          <span title="Google" className="px-2"><Globe className="w-4 h-4 text-syntax-blue" /></span>

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

          <Button variant="ghost" size="icon" onClick={() => setFontSize((f) => Math.max(8, f - 1))} title="Уменьшить"><ZoomOut className="w-4 h-4" /></Button>
          <span className="text-xs w-8 text-center">{fontSize}</span>
          <Button variant="ghost" size="icon" onClick={() => setFontSize((f) => Math.min(40, f + 1))} title="Увеличить"><ZoomIn className="w-4 h-4" /></Button>

          <Button variant="ghost" size="icon" onClick={() => setShowTerm((s) => !s)} title="Терминал"><TermIcon className="w-4 h-4" /></Button>

          <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /> {collaborators}
          </div>
          <Button size="sm" variant="outline" onClick={() => saveCode(code)}><Save className="w-4 h-4 mr-1" />Save</Button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-2 overflow-hidden">
        <div className="border-r border-border">
          <Editor
            height="100%"
            language={project.language === "javascript" ? "javascript" : project.language}
            value={code}
            onChange={(v) => setCode(v || "")}
            onMount={handleMount}
            options={{
              fontSize, fontFamily: "JetBrains Mono, monospace",
              minimap: { enabled: true }, automaticLayout: true,
              tabSize: 2, wordWrap: "on", smoothScrolling: true,
              suggestOnTriggerCharacters: true, quickSuggestions: true,
              tabCompletion: "on", acceptSuggestionOnEnter: "on",
              cursorBlinking: "smooth", padding: { top: 12 },
            }}
          />
        </div>
        <div className="flex flex-col">
          <div className={showTerm ? "h-1/2" : "h-full"}>
            <RunnerPanel code={code} language={project.language as LangKey} />
          </div>
          {showTerm && (
            <div className="h-1/2 border-t border-border">
              <TerminalPanel onClose={() => setShowTerm(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor_;
