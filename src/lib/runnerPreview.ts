import { LangKey } from "@/lib/languages";

const injectCssIntoHtml = (html: string, css?: string) => {
  if (!css?.trim()) return html;

  const styleTag = `<style data-linked-css="true">\n${css}\n</style>`;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${styleTag}</head>`);
  }

  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}<head>${styleTag}</head>`);
  }

  return `<!DOCTYPE html><html><head>${styleTag}</head><body>${html}</body></html>`;
};

export const buildPreviewHtml = (code: string, language: LangKey, linkedCss = "") => {
  if (language === "html") return injectCssIntoHtml(code, linkedCss);

  if (language === "css") {
    return `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>Preview</h1><p>Sample paragraph styled with your CSS.</p><button>Button</button></body></html>`;
  }

  return `<!DOCTYPE html><html><head><style>body{background:#0f172a;color:#fff;font-family:monospace;padding:1rem}</style></head><body><pre id="out"></pre><script>
    const out = document.getElementById('out');
    const log = (...a) => out.textContent += a.join(' ') + '\n';
    const origLog = console.log; console.log = (...a) => { log(...a); origLog(...a); };
    const origErr = console.error; console.error = (...a) => { log('Error:', ...a); origErr(...a); };
    try { ${code} } catch(e) { log('Error:', e.message); }
  </script></body></html>`;
};

export const openPreviewInNewTab = (html: string) => {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};