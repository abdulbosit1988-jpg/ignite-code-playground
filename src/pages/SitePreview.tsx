import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { buildPreviewHtml } from "@/lib/runnerPreview";

const SitePreview = () => {
  const { projectName } = useParams();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Find project by name
        const { data: project, error: pErr } = await supabase
          .from("projects")
          .select("*")
          .eq("name", projectName!)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pErr) {
          console.error("Database error:", pErr);
          setError("Ошибка при загрузке проекта: " + pErr.message);
          return;
        }
        if (!project) {
          console.warn("Project not found:", projectName);
          setError(`Проект "${projectName}" не найден`);
          return;
        }

        // Load CSS and JS if linked
        let css = "";
        let js = "";
        if (project.language === "html") {
          const baseName = project.name.replace(/\.(html?|css|js|py)$/i, "");
          const cssName = baseName + ".css";
          const jsName = baseName + ".js";

          const { data: files } = await supabase
            .from("files")
            .select("name, content")
            .eq("user_id", project.user_id)
            .in("name", [cssName, jsName]);
          
          css = files?.find(f => f.name === cssName)?.content || "";
          js = files?.find(f => f.name === jsName)?.content || "";
        }

        if (!project.code?.trim()) {
          setError("В проекте пока нет кода");
          return;
        }

        let fullHtml = buildPreviewHtml(project.code, project.language as any, css);
        if (js) {
          fullHtml = fullHtml.replace("</body>", `<script>${js}</script></body>`);
        }
        setHtml(fullHtml);
      } catch (err: any) {
        console.error("Preview error:", err);
        setError("Ошибка генерации превью: " + err.message);
      }
    })();
  }, [projectName]);

  if (error) return <div className="min-h-screen flex items-center justify-center text-destructive font-bold">{error}</div>;
  if (!html) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <iframe
      srcDoc={html}
      className="w-full h-screen border-none"
      title="Site Preview"
      sandbox="allow-scripts allow-modals allow-forms"
    />
  );
};

export default SitePreview;
