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

// Защитный <style>/<script> блок, который скрывает исходник от случайного просмотра
// (отключает выделение текста, контекстное меню «Просмотр кода», DevTools-горячие клавиши,
// drag/drop, печать и копирование).
const HIDE_SOURCE_GUARD = `
<style>
  html,body{
    -webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;
    -webkit-touch-callout:none;
  }
  img,video,canvas,svg{-webkit-user-drag:none;user-drag:none;pointer-events:auto}
  @media print { body { display:none !important } }
</style>
<script>
  (function(){
    var block = function(e){ e.preventDefault(); e.stopPropagation(); return false; };
    document.addEventListener('contextmenu', block, true);
    document.addEventListener('dragstart', block, true);
    document.addEventListener('selectstart', block, true);
    document.addEventListener('copy', block, true);
    document.addEventListener('cut', block, true);
    document.addEventListener('keydown', function(e){
      var k = (e.key || '').toLowerCase();
      var ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'F12') return block(e);
      if (ctrl && e.shiftKey && (k==='i'||k==='j'||k==='c'||k==='k')) return block(e);
      if (ctrl && (k==='u'||k==='s'||k==='p')) return block(e);
    }, true);
    // На всякий случай — отчищаем console при загрузке
    try { console.clear && console.clear(); } catch(_) {}
  })();
</script>`;

const wrapWithGuard = (html: string): string => {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${HIDE_SOURCE_GUARD}</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${HIDE_SOURCE_GUARD}</html>`);
  return html + HIDE_SOURCE_GUARD;
};

export const buildPreviewHtml = (code: string, language: LangKey, linkedCss = "") => {
  if (language === "html") return wrapWithGuard(injectCssIntoHtml(code, linkedCss));

  if (language === "css") {
    return wrapWithGuard(`<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>Preview</h1><p>Sample paragraph styled with your CSS.</p><button>Button</button></body></html>`);
  }

  return wrapWithGuard(`<!DOCTYPE html><html><head><style>body{background:#0f172a;color:#fff;font-family:monospace;padding:1rem}</style></head><body><pre id="out"></pre><script>
    const out = document.getElementById('out');
    const log = (...a) => out.textContent += a.join(' ') + '\n';
    const origLog = console.log; console.log = (...a) => { log(...a); origLog(...a); };
    const origErr = console.error; console.error = (...a) => { log('Error:', ...a); origErr(...a); };
    try { ${code} } catch(e) { log('Error:', e.message); }
  </script></body></html>`);
};

export const openPreviewInNewTab = (html: string) => {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};