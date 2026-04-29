import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LANGUAGES, LangKey, guessLangByName } from "@/lib/languages";
import { Code2, FolderOpen, Plus, LogOut, Shield, Copy, Users, Trash2, Settings as SettingsIcon, Upload, Link2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { pickLocalFile } from "@/lib/desktop";

interface Project { id: string; name: string; language: string; updated_at: string; }

const Dashboard = () => {
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [open, setOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState("");
  const [lang, setLang] = useState<LangKey>("python");
  const [joinCode, setJoinCode] = useState("");
  const [myGrade, setMyGrade] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("projects").select("id,name,language,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
      setProjects(p || []);
      const { data: prof } = await supabase.from("profiles").select("invite_code").eq("user_id", user.id).maybeSingle();
      if (prof) setInviteCode(prof.invite_code);
      const { data: g } = await supabase.from("grades").select("grade").eq("user_id", user.id).maybeSingle();
      if (g) setMyGrade(g.grade);
    })();
  }, [user]);

  const create = async () => {
    if (!name.trim() || !user) return;
    
    const projectName = name.trim();

    // Check if name is English only (letters, numbers, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
      toast.error("Название проекта должно быть на английском (латиница, цифры, дефис)");
      return;
    }

    // Check uniqueness for this user
    const { data: existingProj } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", projectName)
      .maybeSingle();

    if (existingProj) {
      toast.error("Проект с таким названием уже существует");
      return;
    }

    const lconf = LANGUAGES.find((l) => l.key === lang)!;
    const { data, error } = await supabase.from("projects").insert({ user_id: user.id, name: projectName, language: lang, code: lconf.starter }).select().single();
    if (error) { toast.error(error.message); return; }

    // При создании HTML-проекта автоматически создаём парный CSS-файл (если ещё нет)
    if (lang === "html") {
      const cssName = projectName.replace(/\.html?$/i, "") + ".css";
      const { data: existing } = await supabase
        .from("files")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", cssName)
        .maybeSingle();
      if (!existing) {
        const cssStarter = `/* Стили для ${projectName} */\nbody {\n  font-family: system-ui, sans-serif;\n  background: #0f172a;\n  color: #fff;\n  padding: 2rem;\n}\nh1 { color: #22c55e; }\n`;
        await supabase.from("files").insert({
          user_id: user.id,
          name: cssName,
          kind: "file",
          language: "css",
          mime: "text/css",
          content: cssStarter,
        });
      }
      
      const jsName = projectName.replace(/\.html?$/i, "") + ".js";
      const { data: exJs } = await supabase.from("files").select("id").eq("user_id", user.id).eq("name", jsName).maybeSingle();
      if (!exJs) {
        await supabase.from("files").insert({
          user_id: user.id,
          name: jsName,
          kind: "file",
          language: "javascript",
          mime: "application/javascript",
          content: `// Скрипты для ${projectName}\nconsole.log('Hello from JS!');\n`,
        });
      }
    }

    setOpen(false); setName("");
    nav(`/editor/${data.id}`);
  };

  const openLocalFile = async () => {
    if (!user) return;
    const picked = await pickLocalFile();
    if (!picked) { toast.message("Файл не выбран"); return; }
    if (picked.isBinary) {
      toast.error("Можно открыть только текстовый файл с кодом");
      return;
    }
    const language = guessLangByName(picked.name);
    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: picked.name, language, code: picked.content })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    toast.success(`Открыт файл ${picked.name}`);
    nav(`/editor/${data.id}`);
  };

  const join = async () => {
    if (!joinCode.trim()) return;
    const { data: ownerId } = await supabase.rpc("find_user_by_invite", { _code: joinCode.trim() });
    if (!ownerId) { toast.error("Код не найден"); return; }
    if (ownerId === user?.id) { toast.error("Это ваш собственный код"); return; }
    nav(`/editor/shared/${joinCode.trim()}`);
  };

  const remove = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((p) => p.filter((x) => x.id !== id));
    toast.success("Удалено");
  };

  const copyInvite = () => { navigator.clipboard.writeText(inviteCode); toast.success("Код скопирован!"); };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border sticky top-0 z-20 backdrop-blur" style={{ background: `hsl(var(--navbar) / 0.92)` }}>
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2 min-w-0">
            <Code2 className="w-6 h-6 text-primary shrink-0" />
            <span className="font-bold truncate">Online Coding</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => nav("/admin")}>
                <Shield className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => nav("/settings")} title="Настройки">
              <SettingsIcon className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); nav("/"); }}>
              <LogOut className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
        <div className="glass rounded-xl p-6 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Привет, {user?.email}</p>
            <p className="text-sm">Твой код-приглашение для совместной работы:</p>
            {myGrade !== null && (
              <p className="mt-2 text-sm font-semibold">Твоя оценка: <span className="text-primary text-xl px-2 py-1 rounded bg-primary/10">{myGrade}</span></p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="px-4 py-2 rounded bg-secondary font-mono text-primary text-lg">{inviteCode || "..."}</code>
            <Button size="icon" variant="outline" onClick={copyInvite}><Copy className="w-4 h-4" /></Button>
            <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary"><Users className="w-4 h-4 mr-2" />Присоединиться</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Присоединиться к проекту друга</DialogTitle></DialogHeader>
                <Label>Код приглашения</Label>
                <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="например a1b2c3d4" />
                <Button onClick={join}>Войти</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-bold">Мои проекты</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openLocalFile} title="Открыть файл с компьютера">
              <Upload className="w-4 h-4 mr-2" />Открыть с компьютера
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Новый</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Создать новый проект</DialogTitle></DialogHeader>
                <Label>Название</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-app" />
                <Label className="mt-2">Язык</Label>
                <div className="grid grid-cols-3 gap-3">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => setLang(l.key)}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${lang === l.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                    >
                      {l.image ? (
                        <img src={l.image} alt={`${l.name} logo`} className="w-10 h-10 object-contain" />
                      ) : (
                        <span className="text-3xl">{l.icon}</span>
                      )}
                      <span className="text-sm font-medium">{l.name}</span>
                    </button>
                  ))}
                </div>
                <Button onClick={create} className="mt-2">Создать</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            Пока нет проектов. Нажми «Новый», чтобы начать.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const lconf = LANGUAGES.find((l) => l.key === p.language);
              const isHtml = p.language === "html";
              const siteUrl = `${window.location.origin}/site/${encodeURIComponent(p.name)}`;
              return (
                <div key={p.id} className="glass rounded-xl p-5 group hover:border-primary/50 transition-all cursor-pointer" onClick={() => nav(`/editor/${p.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    {lconf?.image ? (
                      <img src={lconf.image} alt={`${lconf.name} logo`} className="w-10 h-10 object-contain" />
                    ) : (
                      <span className="text-3xl">{lconf?.icon}</span>
                    )}
                    <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100">
                      {isHtml && (
                        <>
                          <Button variant="ghost" size="icon" title="Открыть сайт" onClick={(e) => { e.stopPropagation(); window.open(siteUrl, "_blank"); }}>
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Копировать ссылку на сайт" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(siteUrl); toast.success("Ссылка скопирована!"); }}>
                            <Link2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(p.id); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{lconf?.name} · {new Date(p.updated_at).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
