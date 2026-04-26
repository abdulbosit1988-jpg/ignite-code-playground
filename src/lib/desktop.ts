// Простая эвристика «это компьютер (Win/Mac/Linux), а не телефон/планшет»
export const isDesktopOS = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua);
  if (isMobile) return false;
  return /Windows|Macintosh|Mac OS X|Linux|X11|CrOS/i.test(ua);
};

// Открыть файл с локального диска через стандартный диалог браузера.
// Возвращает { name, content } или null, если пользователь отменил выбор.
export const pickLocalFile = (): Promise<{ name: string; content: string } | null> =>
  new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".py,.html,.htm,.css,.js,.mjs,.json,.go,.java,.txt,.md";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const text = await file.text();
      resolve({ name: file.name, content: text });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
