// AI inline completion provider for Monaco — стиль GitHub Copilot.
// Дёргает edge-function `ai-fix` в режиме `complete`, кэширует и дебаунсит.
import { supabase } from "@/integrations/supabase/client";
import type { LangKey } from "@/lib/languages";

let registered = false;

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const fetchCompletion = async (language: LangKey, prefix: string, suffix: string): Promise<string> => {
  // Берём только окно ±2000 символов, чтобы не отправлять весь файл.
  const px = prefix.slice(-2000);
  const sx = suffix.slice(0, 1000);
  const key = `${language}::${px}::${sx}`;
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-fix", {
        body: { language, mode: "complete", prefix: px, suffix: sx, code: "" },
      });
      if (error || (data as any)?.error) return "";
      let result = String((data as any)?.result ?? "").trim();
      // На всякий случай уберём остатки markdown
      result = result.replace(/^```[\w-]*\n?/i, "").replace(/```\s*$/i, "").trim();
      cache.set(key, result);
      return result;
    } catch {
      return "";
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
};

// Дебаунс по позиции — не дёргаем AI на каждый символ.
let debounceTimer: number | null = null;
const debouncedSuggestion = (language: LangKey, prefix: string, suffix: string, delay = 220): Promise<string> =>
  new Promise((resolve) => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(async () => {
      const r = await fetchCompletion(language, prefix, suffix);
      resolve(r);
    }, delay);
  });

export const registerAiCompletions = (monaco: any, getLanguage: () => LangKey) => {
  if (registered) return;
  registered = true;

  const provider = {
    provideInlineCompletions: async (model: any, position: any) => {
      const language = getLanguage();
      // AI-подсказки имеют смысл только для языков программирования.
      if (!["python", "javascript", "html", "css", "go", "java"].includes(language)) {
        return { items: [] };
      }
      const fullText: string = model.getValue();
      const offset: number = model.getOffsetAt(position);
      const prefix = fullText.slice(0, offset);
      const suffix = fullText.slice(offset);

      // Не подсказываем посреди слова (даём приоритет обычным suggest-ам).
      const charAfter = suffix.slice(0, 1);
      if (/\w/.test(charAfter)) return { items: [] };
      // Слишком короткий контекст — пропускаем.
      if (prefix.trim().length < 1) return { items: [] };

      const text = await debouncedSuggestion(language, prefix, suffix);
      if (!text) return { items: [] };

      return {
        items: [
          {
            insertText: text,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
          },
        ],
      };
    },
    freeInlineCompletions: () => {},
  };

  for (const lang of ["python", "javascript", "html", "css", "go", "java"]) {
    monaco.languages.registerInlineCompletionsProvider(lang, provider);
  }
};
