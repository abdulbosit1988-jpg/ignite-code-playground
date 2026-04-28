import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, Eye, Loader2, Shield, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const SUPER_ADMIN_EMAIL = "abdulbosit1988@gmail.com";

interface UserRow {
  user_id: string; email: string; display_name: string;
  grade: number | null; project_count: number; selected: boolean;
  is_admin: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  "5": "bg-grade-5 text-white", "4": "bg-grade-4 text-white",
  "3": "bg-grade-3 text-black", "2": "bg-grade-2 text-white",
  "absent": "bg-grade-absent text-white",
};

const Admin = () => {
  const { isAdmin, user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectPicker, setProjectPicker] = useState<{ open: boolean, user: UserRow | null, projects: any[] }>({ open: false, user: null, projects: [] });

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [{ data: profs }, { data: grades }, { data: projs }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("user_id,email,display_name"),
        supabase.from("grades").select("user_id,grade"),
        supabase.from("projects").select("user_id"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const counts: Record<string, number> = {};
      projs?.forEach((p: any) => { counts[p.user_id] = (counts[p.user_id] || 0) + 1; });
      const gmap: Record<string, number | null> = {};
      grades?.forEach((g: any) => { gmap[g.user_id] = g.grade; });
      const adminSet = new Set((roles || []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
      setRows((profs || []).map((p: any) => ({
        user_id: p.user_id, email: p.email || "", display_name: p.display_name || "",
        grade: gmap[p.user_id] ?? null, project_count: counts[p.user_id] || 0, selected: false,
        is_admin: adminSet.has(p.user_id),
      })));
      setLoading(false);
    })();
  }, [isAdmin]);

  const setGrade = async (userId: string, grade: number | null) => {
    if (!user) return;
    const { error } = await supabase.from("grades").upsert({ user_id: userId, graded_by: user.id, grade }, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.map((r) => r.user_id === userId ? { ...r, grade } : r));
    toast.success("Оценка сохранена");
  };

  const exportExcel = () => {
    const selected = rows.filter((r) => r.selected);
    const data = (selected.length ? selected : rows).map((r, i) => ({
      "№": i + 1,
      "Имя": r.display_name,
      "Email": r.email,
      "Оценка": r.grade === null ? "Отсутствует" : r.grade,
      "Проектов": r.project_count,
      "Админ": r.is_admin ? "Да" : "Нет",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Оценки");
    XLSX.writeFile(wb, `grades_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel-файл скачан");
  };

  const viewProjects = async (row: UserRow) => {
    const { data } = await supabase.from("projects").select("id, name, language, updated_at").eq("user_id", row.user_id).order("updated_at", { ascending: false });
    if (!data || data.length === 0) { toast.error("У пользователя нет проектов"); return; }
    if (data.length === 1) {
      nav(`/editor/${data[0].id}`);
    } else {
      setProjectPicker({ open: true, user: row, projects: data });
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (email === SUPER_ADMIN_EMAIL && !isSuperAdmin) {
      toast.error("Этого администратора может удалить только владелец");
      return;
    }
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: userId } });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Ошибка удаления");
      return;
    }
    setRows((rs) => rs.filter((r) => r.user_id !== userId));
    toast.success(`Аккаунт ${email} удалён`);
  };

  const toggleAdmin = async (row: UserRow) => {
    if (row.email === SUPER_ADMIN_EMAIL) {
      toast.error("Роль владельца изменить нельзя");
      return;
    }
    if (row.is_admin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", row.user_id).eq("role", "admin");
      if (error) { toast.error(error.message); return; }
      setRows((rs) => rs.map((r) => r.user_id === row.user_id ? { ...r, is_admin: false } : r));
      toast.success(`${row.email} больше не админ`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.user_id, role: "admin" });
      if (error) { toast.error(error.message); return; }
      setRows((rs) => rs.map((r) => r.user_id === row.user_id ? { ...r, is_admin: true } : r));
      toast.success(`${row.email} назначен админом`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const canDelete = (r: UserRow) => r.email !== SUPER_ADMIN_EMAIL || isSuperAdmin;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border sticky top-0 z-10 backdrop-blur" style={{ background: `hsl(var(--navbar) / 0.92)` }}>
        <div className="container flex items-center justify-between h-14 sm:h-16 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => nav("/dashboard")}><ArrowLeft className="w-4 h-4" /></Button>
            <h1 className="font-bold truncate text-sm sm:text-base">Админ-панель</h1>
          </div>
          <Button onClick={exportExcel} size="sm">
            <Download className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Excel</span>
          </Button>
        </div>
      </header>

      <div className="container py-4 sm:py-6">
        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {rows.map((r) => (
            <div key={r.user_id} className="glass rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate flex items-center gap-1">
                    {r.display_name || "—"}
                    {r.is_admin && <Shield className="w-3 h-3 text-primary shrink-0" />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                  <p className="text-xs text-muted-foreground">Проектов: {r.project_count}</p>
                </div>
                <Checkbox checked={r.selected} onCheckedChange={(v) => setRows((rs) => rs.map((x) => x.user_id === r.user_id ? { ...x, selected: !!v } : x))} />
              </div>
              <div className="flex gap-1 flex-wrap">
                {[5, 4, 3, 2].map((g) => (
                  <button key={g} onClick={() => setGrade(r.user_id, g)}
                    className={`w-8 h-8 rounded text-sm font-bold transition-all ${r.grade === g ? GRADE_COLORS[g.toString()] + " ring-2 ring-primary" : "bg-secondary"}`}>{g}</button>
                ))}
                <button onClick={() => setGrade(r.user_id, null)}
                  className={`w-8 h-8 rounded text-sm font-bold ${r.grade === null ? GRADE_COLORS["absent"] + " ring-2 ring-primary" : "bg-secondary"}`}>Н</button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => viewProjects(r)}><Eye className="w-3 h-3 mr-1" />Проект</Button>
                {r.email !== SUPER_ADMIN_EMAIL && (
                  <Button variant={r.is_admin ? "secondary" : "outline"} size="sm" onClick={() => toggleAdmin(r)}>
                    {r.is_admin ? <><ShieldOff className="w-3 h-3 mr-1" />Снять</> : <><Shield className="w-3 h-3 mr-1" />Админ</>}
                  </Button>
                )}
                {canDelete(r) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm"><Trash2 className="w-3 h-3" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Аккаунт <b>{r.email}</b> и все его проекты, файлы и оценки будут удалены безвозвратно.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteUser(r.user_id, r.email)}>Удалить</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="p-3 text-left w-10">
                  <Checkbox checked={rows.every((r) => r.selected) && rows.length > 0}
                    onCheckedChange={(v) => setRows((rs) => rs.map((r) => ({ ...r, selected: !!v })))} />
                </th>
                <th className="p-3 text-left">Имя</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Проекты</th>
                <th className="p-3 text-left">Оценка</th>
                <th className="p-3 text-left">Роль</th>
                <th className="p-3 text-left">Действия</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3">
                    <Checkbox checked={r.selected} onCheckedChange={(v) => setRows((rs) => rs.map((x) => x.user_id === r.user_id ? { ...x, selected: !!v } : x))} />
                  </td>
                  <td className="p-3 font-medium">
                    <span className="flex items-center gap-1">
                      {r.display_name || "—"}
                      {r.is_admin && <Shield className="w-3 h-3 text-primary" aria-label="Админ" />}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.email}</td>
                  <td className="p-3">{r.project_count}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {[5, 4, 3, 2].map((g) => (
                        <button key={g} onClick={() => setGrade(r.user_id, g)}
                          className={`w-8 h-8 rounded text-sm font-bold transition-all ${r.grade === g ? GRADE_COLORS[g.toString()] + " ring-2 ring-offset-2 ring-offset-background ring-primary" : "bg-secondary hover:bg-secondary/70"}`}>
                          {g}
                        </button>
                      ))}
                      <button onClick={() => setGrade(r.user_id, null)}
                        className={`w-8 h-8 rounded text-sm font-bold ${r.grade === null ? GRADE_COLORS["absent"] + " ring-2 ring-offset-2 ring-offset-background ring-primary" : "bg-secondary hover:bg-secondary/70"}`}>Н</button>
                    </div>
                  </td>
                  <td className="p-3">
                    {r.email === SUPER_ADMIN_EMAIL ? (
                      <span className="text-xs text-primary font-semibold">Владелец</span>
                    ) : (
                      <Button variant={r.is_admin ? "secondary" : "outline"} size="sm" onClick={() => toggleAdmin(r)}>
                        {r.is_admin ? <><ShieldOff className="w-3 h-3 mr-1" />Снять</> : <><Shield className="w-3 h-3 mr-1" />Сделать</>}
                      </Button>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => viewProjects(r)}><Eye className="w-3 h-3 mr-1" />Проект</Button>
                      {canDelete(r) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" title="Удалить аккаунт"><Trash2 className="w-3 h-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Аккаунт <b>{r.email}</b> и все его проекты, файлы и оценки будут удалены безвозвратно.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(r.user_id, r.email)}>Удалить</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs sm:text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-5"></span>5</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-4"></span>4</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-3"></span>3</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-2"></span>2</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-absent"></span>Н</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-primary" />— админ</span>
        </div>
      </div>

      <Dialog open={projectPicker.open} onOpenChange={(v) => setProjectPicker(p => ({ ...p, open: v }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Выберите проект {projectPicker.user?.display_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-2">
              {projectPicker.projects.map((p) => (
                <button key={p.id} onClick={() => nav(`/editor/${p.id}`)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all flex items-center justify-between group">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.language} · {new Date(p.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Eye className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
