import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Plus, Trash2, FolderPlus, FilePlus, Upload } from "lucide-react";
import { guessLangByName, LangKey } from "@/lib/languages";
import { toast } from "sonner";

export interface FileNode {
  id: string;
  parent_id: string | null;
  name: string;
  kind: "folder" | "file";
  language: string | null;
  mime: string | null;
  content: string;
}

interface Props {
  onOpenFile: (file: FileNode) => void;
  activeFileId?: string | null;
}

export const FileExplorer = ({ onOpenFile, activeFileId }: Props) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set([""]));
  const [creating, setCreating] = useState<{ parentId: string | null; kind: "folder" | "file" } | null>(null);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("files").select("*").eq("user_id", user.id).order("kind", { ascending: true }).order("name");
    setFiles((data as FileNode[]) || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const create = async () => {
    if (!creating || !newName.trim() || !user) { setCreating(null); setNewName(""); return; }
    const lang = creating.kind === "file" ? guessLangByName(newName) : null;
    const { error } = await supabase.from("files").insert({
      user_id: user.id,
      parent_id: creating.parentId,
      name: newName.trim(),
      kind: creating.kind,
      language: lang,
      mime: creating.kind === "file" ? "text/plain" : null,
      content: "",
    });
    if (error) toast.error(error.message);
    else { toast.success(`${creating.kind === "folder" ? "Папка" : "Файл"} создан`); if (creating.parentId) setExpanded((s) => new Set([...s, creating.parentId!])); load(); }
    setCreating(null); setNewName("");
  };

  const remove = async (f: FileNode) => {
    if (!confirm(`Удалить ${f.kind === "folder" ? "папку" : "файл"} "${f.name}"?`)) return;
    await supabase.from("files").delete().eq("id", f.id);
    load();
  };

  const upload = async (parentId: string | null, fileList: FileList | null) => {
    if (!fileList || !user) return;
    for (const f of Array.from(fileList)) {
      const isText = f.type.startsWith("text/") || /\.(txt|md|py|js|html|css|json|go|java)$/i.test(f.name);
      let content = "";
      let mime = f.type || "application/octet-stream";
      if (isText) {
        content = await f.text();
      } else {
        // store as data URL for images / audio / video
        const buf = await f.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        content = `data:${mime};base64,${b64}`;
      }
      await supabase.from("files").insert({
        user_id: user.id, parent_id: parentId, name: f.name, kind: "file",
        language: guessLangByName(f.name), mime, content,
      });
    }
    toast.success("Загружено");
    load();
  };

  const renderNode = (parentId: string | null, depth: number) => {
    const items = files.filter((f) => f.parent_id === parentId);
    return items.map((f) => {
      const isOpen = expanded.has(f.id);
      const active = f.id === activeFileId;
      return (
        <div key={f.id}>
          <div
            className={`flex items-center gap-1 px-2 py-1 hover:bg-secondary/50 cursor-pointer text-sm group ${active ? "bg-primary/10 text-primary" : ""}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => f.kind === "folder" ? toggle(f.id) : onOpenFile(f)}
          >
            {f.kind === "folder" ? (
              <>
                {isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                {isOpen ? <FolderOpen className="w-4 h-4 text-syntax-yellow shrink-0" /> : <Folder className="w-4 h-4 text-syntax-yellow shrink-0" />}
              </>
            ) : (
              <>
                <span className="w-3" />
                <FileText className="w-4 h-4 text-syntax-blue shrink-0" />
              </>
            )}
            <span className="truncate flex-1">{f.name}</span>
            <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
              {f.kind === "folder" && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setCreating({ parentId: f.id, kind: "file" }); setExpanded((s) => new Set([...s, f.id])); }} title="Новый файл" className="p-0.5 hover:text-primary"><FilePlus className="w-3 h-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setCreating({ parentId: f.id, kind: "folder" }); setExpanded((s) => new Set([...s, f.id])); }} title="Новая папка" className="p-0.5 hover:text-primary"><FolderPlus className="w-3 h-3" /></button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); remove(f); }} title="Удалить" className="p-0.5 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
          {f.kind === "folder" && isOpen && (
            <>
              {creating?.parentId === f.id && (
                <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
                  <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" ? create() : e.key === "Escape" && setCreating(null)}
                    onBlur={create}
                    placeholder={creating.kind === "file" ? "file.txt" : "folder"}
                    className="h-6 text-xs" />
                </div>
              )}
              {renderNode(f.id, depth + 1)}
            </>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider">Проводник</span>
        <div className="flex gap-1">
          <button onClick={() => setCreating({ parentId: null, kind: "file" })} title="Новый файл" className="p-1 hover:text-primary"><FilePlus className="w-4 h-4" /></button>
          <button onClick={() => setCreating({ parentId: null, kind: "folder" })} title="Новая папка" className="p-1 hover:text-primary"><FolderPlus className="w-4 h-4" /></button>
          <label title="Загрузить файл" className="p-1 hover:text-primary cursor-pointer">
            <Upload className="w-4 h-4" />
            <input type="file" multiple className="hidden" onChange={(e) => { upload(null, e.target.files); e.target.value = ""; }} />
          </label>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {creating?.parentId === null && (
          <div className="flex items-center gap-1 px-2 py-1">
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" ? create() : e.key === "Escape" && setCreating(null)}
              onBlur={create}
              placeholder={creating.kind === "file" ? "file.txt" : "folder"}
              className="h-6 text-xs" />
          </div>
        )}
        {files.length === 0 && !creating && (
          <div className="text-xs text-muted-foreground p-4 text-center">
            Пусто.<br />Нажми <FilePlus className="w-3 h-3 inline" /> или <FolderPlus className="w-3 h-3 inline" /> чтобы создать.
          </div>
        )}
        {renderNode(null, 0)}
      </div>
    </div>
  );
};
