import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserRow {
  user_id: string; email: string; display_name: string;
  grade: number | null; project_count: number; selected: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  "5": "bg-grade-5 text-white", "4": "bg-grade-4 text-white",
  "3": "bg-grade-3 text-black", "2": "bg-grade-2 text-white",
  "absent": "bg-grade-absent text-white",
};
const GRADE_LABELS: Record<string, string> = { "5": "5", "4": "4", "3": "3", "2": "2", "absent": "Н" };

const Admin = () => {
  const { isAdmin, user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data: profs } = await supabase.from("profiles").select("user_id,email,display_name");
      const { data: grades } = await supabase.from("grades").select("user_id,grade");
      const { data: projs } = await supabase.from("projects").select("user_id");
      const counts: Record<string, number> = {};
      projs?.forEach((p: any) => { counts[p.user_id] = (counts[p.user_id] || 0) + 1; });
      const gmap: Record<string, number | null> = {};
      grades?.forEach((g: any) => { gmap[g.user_id] = g.grade; });
      setRows((profs || []).map((p: any) => ({
        user_id: p.user_id, email: p.email || "", display_name: p.display_name || "",
        grade: gmap[p.user_id] ?? null, project_count: counts[p.user_id] || 0, selected: false,
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
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Оценки");
    XLSX.writeFile(wb, `grades_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel-файл скачан");
  };

  const viewProjects = async (userId: string) => {
    const { data } = await supabase.from("projects").select("id").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) { toast.error("У пользователя нет проектов"); return; }
    nav(`/editor/${data.id}`);
  };

  const deleteUser = async (userId: string, email: string) => {
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: userId } });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Ошибка удаления");
      return;
    }
    setRows((rs) => rs.filter((r) => r.user_id !== userId));
    toast.success(`Аккаунт ${email} удалён`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border glass sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => nav("/dashboard")}><ArrowLeft className="w-4 h-4" /></Button>
            <h1 className="font-bold">Админ-панель</h1>
          </div>
          <Button onClick={exportExcel}><Download className="w-4 h-4 mr-2" />Скачать Excel</Button>
        </div>
      </header>

      <div className="container py-6">
        <div className="glass rounded-xl overflow-hidden">
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
                <th className="p-3 text-left">Действия</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3">
                    <Checkbox checked={r.selected} onCheckedChange={(v) => setRows((rs) => rs.map((x) => x.user_id === r.user_id ? { ...x, selected: !!v } : x))} />
                  </td>
                  <td className="p-3 font-medium">{r.display_name || "—"}</td>
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
                        className={`w-8 h-8 rounded text-sm font-bold ${r.grade === null && r.grade !== undefined ? GRADE_COLORS["absent"] + " ring-2 ring-offset-2 ring-offset-background ring-primary" : "bg-secondary hover:bg-secondary/70"}`}>Н</button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => viewProjects(r.user_id)}><Eye className="w-3 h-3 mr-1" />Проект</Button>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-5"></span>5 — отлично</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-4"></span>4 — хорошо</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-3"></span>3 — удовл.</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-2"></span>2 — плохо</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-grade-absent"></span>Н — отсутствует</span>
        </div>
      </div>
    </div>
  );
};

export default Admin;
