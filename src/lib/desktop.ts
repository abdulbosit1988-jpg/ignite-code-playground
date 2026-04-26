// Простая эвристика «это компьютер (Win/Mac/Linux), а не телефон/планшет»
export const isDesktopOS = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua);
  if (isMobile) return false;
  return /Windows|Macintosh|Mac OS X|Linux|X11|CrOS/i.test(ua);
};

export type PickedFile = { name: string; content: string; isBinary: boolean; mime: string };

// Открыть файл с локального диска через стандартный диалог браузера.
// Возвращает { name, content } или null, если пользователь отменил выбор.
// Бинарные файлы возвращаются как data:URL.
export const pickLocalFile = (): Promise<PickedFile | null> =>
  new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    // Принимаем любые файлы, чтобы диалог открывался полноценно.
    // Конкретные расширения подсказываем хинтом.
    input.accept = "*/*";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.opacity = "0";

    let settled = false;
    const finish = (val: PickedFile | null) => {
      if (settled) return;
      settled = true;
      try { document.body.removeChild(input); } catch {}
      window.removeEventListener("focus", onFocus);
      resolve(val);
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { finish(null); return; }
      const mime = file.type || "application/octet-stream";
      const isText =
        mime.startsWith("text/") ||
        /\.(txt|md|py|js|mjs|ts|tsx|jsx|html?|css|json|go|java|c|cpp|h|rs|rb|php|sh|yml|yaml|xml|svg|csv)$/i.test(file.name);
      try {
        if (isText) {
          const text = await file.text();
          finish({ name: file.name, content: text, isBinary: false, mime: "text/plain" });
        } else {
          const buf = await file.arrayBuffer();
          // безопасное base64 для больших файлов
          let bin = "";
          const bytes = new Uint8Array(buf);
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
          }
          const b64 = btoa(bin);
          finish({ name: file.name, content: `data:${mime};base64,${b64}`, isBinary: true, mime });
        }
      } catch {
        finish(null);
      }
    };

    // Если пользователь закрыл диалог без выбора — focus вернётся на window.
    const onFocus = () => {
      window.setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) finish(null);
      }, 400);
    };
    window.addEventListener("focus", onFocus, { once: true });

    document.body.appendChild(input);
    input.click();
  });
