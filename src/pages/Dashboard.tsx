import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LANGUAGES, LangKey } from "@/lib/languages";
import { Code2, FolderOpen, Plus, LogOut, Shield, Copy, Users, Trash2, Settings as SettingsIcon } from "lucide-react";
import { FileExplorer } from "@/components/FileExplorer";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("projects").select("id,name,language,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
      setProjects(p || []);
      const { data: prof } = await supabase.from("profiles").select("invite_code").eq("user_id", user.id).maybeSingle();
      if (prof) setInviteCode(prof.invite_code);
    })();
  }, [user]);

  const create = async () => {
    if (!name.trim() || !user) return;
    const lconf = LANGUAGES.find((l) => l.key === lang)!;
    const { data, error } = await supabase.from("projects").insert({ user_id: user.id, name: name.trim(), language: lang, code: lconf.starter }).select().single();
    if (error) { toast.error(error.message); return; }
    setOpen(false); setName("");
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

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Мои проекты</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Новый</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Создать новый проект</DialogTitle></DialogHeader>
              <Label>Название</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-app" />
              <Label className="mt-2">Язык</Label>
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.map((l) => (
                  <button key={l.key} onClick={() => setLang(l.key)}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${lang === l.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                    <span className="text-3xl">{l.icon}</span>
                    <span className="text-sm font-medium">{l.name}</span>
                  </button>
                ))}
              </div>
              <Button onClick={create} className="mt-2">Создать</Button>
            </DialogContent>
          </Dialog>
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
              return (
                <div key={p.id} className="glass rounded-xl p-5 group hover:border-primary/50 transition-all cursor-pointer" onClick={() => nav(`/editor/${p.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{lconf?.icon}</span>
                    <Button variant="ghost" size="icon" className="sm:opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); remove(p.id); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{lconf?.name} · {new Date(p.updated_at).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-4">Мои файлы и папки</h2>
          <div className="glass rounded-xl overflow-hidden h-[420px]">
            <FileExplorer onOpenFile={(f) => {
              // Open file in a temporary editor route via projects (create one-shot)
              toast.info(`Открыто: ${f.name}`);
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
