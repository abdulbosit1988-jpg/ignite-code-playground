// VS Code–style autocomplete providers for HTML, CSS, Python, JS.
// Registered once globally — guarded by a module-level flag.
let registered = false;

const PYTHON_API_DOCS: ReadonlyArray<readonly [string, string]> = [
  ["print", "print(value, ..., sep=' ', end='\\n') — вывод в консоль"],
  ["len", "len(obj) — длина строки/списка/словаря"],
  ["range", "range(stop) / range(start, stop, step) — диапазон чисел"],
  ["enumerate", "enumerate(iterable, start=0) — пары (индекс, значение)"],
  ["zip", "zip(a, b, ...) — параллельный обход"],
  ["map", "map(func, iterable) — применить функцию к каждому"],
  ["filter", "filter(func, iterable) — отбор по условию"],
  ["sorted", "sorted(iterable, key=None, reverse=False) — сортировка"],
  ["reversed", "reversed(seq) — обратный порядок"],
  ["sum", "sum(iterable, start=0) — сумма"],
  ["min", "min(iterable) / min(a, b, ...) — минимум"],
  ["max", "max(iterable) / max(a, b, ...) — максимум"],
  ["abs", "abs(x) — модуль числа"],
  ["round", "round(x, ndigits=0) — округление"],
  ["str", "str(value) — преобразование в строку"],
  ["int", "int(value) — преобразование в целое"],
  ["float", "float(value) — преобразование в число с точкой"],
  ["bool", "bool(value) — преобразование в булево"],
  ["list", "list(iterable) — список"],
  ["dict", "dict() — словарь"],
  ["set", "set(iterable) — множество"],
  ["tuple", "tuple(iterable) — кортеж"],
  ["open", "open(path, mode='r', encoding='utf-8') — открыть файл"],
  ["input", "input(prompt='') — чтение строки от пользователя"],
  ["type", "type(obj) — тип объекта"],
  ["isinstance", "isinstance(obj, type) — проверка типа"],
  ["hasattr", "hasattr(obj, name) — есть ли атрибут"],
  ["getattr", "getattr(obj, name, default) — получить атрибут"],
  ["setattr", "setattr(obj, name, value) — установить атрибут"],
  ["requests", "requests.get/post/put/delete — HTTP-запросы"],
  ["json", "json.loads / json.dumps — работа с JSON"],
  ["datetime", "datetime.now() / date.today() — дата и время"],
  ["os", "os.listdir / os.path.join — файловая система"],
  ["pathlib", "Path('file').read_text() — современная работа с путями"],
  ["math", "math.sqrt / math.pi / math.sin — математика"],
  ["random", "random.randint / random.choice — случайные значения"],
  ["re", "re.match / re.search / re.findall — регулярные выражения"],
  ["collections", "Counter, defaultdict, deque — спец-контейнеры"],
  ["itertools", "chain, combinations, product — итераторы"],
  ["functools", "reduce, lru_cache, partial — функциональщина"],
];

const HTML_TAGS = [
  "html", "head", "body", "title", "meta", "link", "style", "script",
  "div", "span", "p", "a", "img", "video", "audio", "source", "track",
  "header", "main", "section", "article", "nav", "aside", "footer",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
  "form", "input", "textarea", "select", "option", "button", "label", "fieldset", "legend",
  "canvas", "svg", "iframe", "details", "summary", "dialog", "picture",
  "strong", "em", "code", "pre", "blockquote", "hr", "br",
];

const HTML_ATTRS = [
  "class", "id", "style", "src", "href", "alt", "title", "rel", "type", "name",
  "value", "placeholder", "required", "disabled", "checked", "selected", "readonly",
  "controls", "autoplay", "loop", "muted", "preload", "poster",
  "width", "height", "target", "download", "lang", "dir", "role", "tabindex",
  "data-*", "aria-label", "aria-hidden", "onclick", "onchange", "oninput", "onsubmit",
];

const CSS_PROPS = [
  "color", "background", "background-color", "background-image", "background-size",
  "display", "position", "top", "right", "bottom", "left", "z-index",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border", "border-radius", "border-width", "border-color", "border-style",
  "font", "font-family", "font-size", "font-weight", "line-height", "text-align",
  "flex", "flex-direction", "justify-content", "align-items", "gap", "flex-wrap",
  "grid", "grid-template-columns", "grid-template-rows", "grid-gap",
  "transition", "transform", "animation", "opacity", "box-shadow", "cursor",
  "overflow", "overflow-x", "overflow-y", "visibility", "object-fit",
];

export const registerSnippets = (monaco: any) => {
  if (registered) return;
  registered = true;

  const snip = (label: string, insert: string, doc?: string, range?: any) => ({
    label,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: insert,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: doc,
    range,
  });

  // ────────────── HTML ──────────────
  monaco.languages.registerCompletionItemProvider("html", {
    triggerCharacters: ["<", "!", " ", "\t", "."],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const tagSnippet = (tag: string, attrs = "") =>
        snip(tag, `<${tag}${attrs ? " " + attrs : ""}>$0</${tag}>`, `HTML тег <${tag}>`, range);

      return {
        suggestions: [
          // Emmet-подобный шаблон
          snip("!", [
            "<!DOCTYPE html>",
            "<html lang=\"${1:en}\">",
            "<head>",
            "  <meta charset=\"UTF-8\" />",
            "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />",
            "  <title>${2:Document}</title>",
            "</head>",
            "<body>",
            "  $0",
            "</body>",
            "</html>",
          ].join("\n"), "Шаблон HTML5", range),

          // Эмметовские расширения
          snip("div.class", "<div class=\"${1:name}\">$0</div>", "div с классом", range),
          snip("div#id", "<div id=\"${1:name}\">$0</div>", "div с id", range),
          snip("ul>li*3", "<ul>\n  <li>$1</li>\n  <li>$2</li>\n  <li>$3</li>\n</ul>", "список из 3 пунктов", range),
          snip("link:css", "<link rel=\"stylesheet\" href=\"${1:style.css}\" />", "подключить CSS", range),
          snip("script:src", "<script src=\"${1:app.js}\"></script>", "внешний JS", range),
          snip("img", "<img src=\"${1:src}\" alt=\"${2:alt}\" />", "<img>", range),
          snip("a", "<a href=\"${1:#}\">$0</a>", "ссылка", range),
          snip("input", "<input type=\"${1:text}\" name=\"${2:name}\" placeholder=\"${3}\" />", "<input>", range),
          snip("button", "<button type=\"${1:button}\">$0</button>", "<button>", range),
          snip("form", "<form action=\"${1:#}\" method=\"${2:post}\">\n  $0\n</form>", "<form>", range),
          snip("table", "<table>\n  <thead><tr><th>$1</th></tr></thead>\n  <tbody><tr><td>$2</td></tr></tbody>\n</table>", "таблица", range),
          snip("video", "<video src=\"${1:video.mp4}\" controls></video>", "<video>", range),
          snip("audio", "<audio src=\"${1:audio.mp3}\" controls></audio>", "<audio>", range),
          snip("iframe", "<iframe src=\"${1:url}\" frameborder=\"0\"></iframe>", "<iframe>", range),

          // Парные теги: tag + Tab → <tag>$0</tag>
          ...HTML_TAGS.map((t) => tagSnippet(t)),

          // Атрибуты
          ...HTML_ATTRS.map((attr) => ({
            label: attr,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${attr}=\"$1\"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `HTML атрибут ${attr}`,
            range,
          })),
        ],
      };
    },
  });

  // ────────────── CSS ──────────────
  monaco.languages.registerCompletionItemProvider("css", {
    triggerCharacters: [":", " ", "-"],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: [
          snip("flex-center", "display: flex;\nalign-items: center;\njustify-content: center;", "Flex-центр", range),
          snip("grid-3", "display: grid;\ngrid-template-columns: repeat(3, 1fr);\ngap: ${1:1rem};", "Сетка 3 колонки", range),
          snip("absolute-fill", "position: absolute;\ninset: 0;", "Заполнить родителя", range),
          snip("transition-all", "transition: all ${1:0.2s} ease;", "Плавный переход", range),
          ...CSS_PROPS.map((prop) => ({
            label: prop,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `${prop}: $0;`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `CSS свойство ${prop}`,
            range,
          })),
        ],
      };
    },
  });

  // ────────────── PYTHON ──────────────
  monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", " ", "\t"],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: [
          snip("print", "print(${1:value})", "вывод в консоль", range),
          snip("def", "def ${1:name}(${2:args}):\n    ${0:pass}", "функция", range),
          snip("class", "class ${1:Name}:\n    def __init__(self${2:, args}):\n        ${0:pass}", "класс", range),
          snip("if", "if ${1:condition}:\n    ${0:pass}", "if", range),
          snip("ifelse", "if ${1:condition}:\n    ${2:pass}\nelse:\n    ${0:pass}", "if/else", range),
          snip("elif", "elif ${1:condition}:\n    ${0:pass}", "elif", range),
          snip("for", "for ${1:i} in ${2:iterable}:\n    ${0:pass}", "for", range),
          snip("forr", "for ${1:i} in range(${2:10}):\n    ${0:pass}", "for range", range),
          snip("while", "while ${1:condition}:\n    ${0:pass}", "while", range),
          snip("try", "try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    ${0:pass}", "try/except", range),
          snip("with", "with open(${1:'file.txt'}, '${2:r}') as f:\n    ${0:pass}", "with open", range),
          snip("import", "import ${1:module}", "import", range),
          snip("from", "from ${1:module} import ${0:name}", "from import", range),
          snip("main", "if __name__ == \"__main__\":\n    ${0:main()}", "точка входа", range),
          snip("lambda", "lambda ${1:x}: ${0:x}", "лямбда", range),
          snip("list-comp", "[${1:x} for ${2:x} in ${3:iterable}]", "list comprehension", range),
          snip("dict-comp", "{${1:k}: ${2:v} for ${3:k}, ${4:v} in ${5:items}}", "dict comprehension", range),
          snip("requests.get", "import requests\nr = requests.get(\"${1:https://}\")\nprint(r.text)", "HTTP GET", range),
          snip("numpy", "import numpy as np\narr = np.array([${1:1, 2, 3}])", "numpy", range),
          snip("pandas", "import pandas as pd\ndf = pd.read_csv(\"${1:data.csv}\")", "pandas", range),
          snip("async-def", "async def ${1:name}(${2:args}):\n    ${0:pass}", "async функция", range),
          snip("pathlib-read", "from pathlib import Path\ntext = Path('${1:file.txt}').read_text(encoding='utf-8')", "Path read_text", range),
          snip("pathlib-write", "from pathlib import Path\nPath('${1:file.txt}').write_text(${2:text}, encoding='utf-8')", "Path write_text", range),
          snip("json-load", "import json\nwith open('${1:file.json}', 'r', encoding='utf-8') as f:\n    data = json.load(f)", "json load", range),
          snip("json-dump", "import json\nwith open('${1:file.json}', 'w', encoding='utf-8') as f:\n    json.dump(${2:data}, f, ensure_ascii=False, indent=2)", "json dump", range),
          ...PYTHON_API_DOCS.map(([label, documentation]) => ({
            label,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: label,
            documentation,
            range,
          })),
        ],
      };
    },
  });

  // ────────────── JAVASCRIPT ──────────────
  monaco.languages.registerCompletionItemProvider("javascript", {
    triggerCharacters: [".", " ", "\t"],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: [
          snip("log", "console.log($0);", "console.log", range),
          snip("fn", "function ${1:name}(${2:args}) {\n  $0\n}", "функция", range),
          snip("arrow", "const ${1:name} = (${2:args}) => {\n  $0\n};", "стрелочная функция", range),
          snip("if", "if (${1:condition}) {\n  $0\n}", "if", range),
          snip("for", "for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n  $0\n}", "for", range),
          snip("forof", "for (const ${1:item} of ${2:array}) {\n  $0\n}", "for...of", range),
          snip("foreach", "${1:array}.forEach((${2:item}) => {\n  $0\n});", "forEach", range),
          snip("map", "${1:array}.map((${2:item}) => $0)", "map", range),
          snip("filter", "${1:array}.filter((${2:item}) => $0)", "filter", range),
          snip("fetch", "const res = await fetch(\"${1:url}\");\nconst data = await res.json();\nconsole.log(data);", "fetch", range),
          snip("try", "try {\n  $1\n} catch (e) {\n  console.error(e);\n}", "try/catch", range),
          snip("class", "class ${1:Name} {\n  constructor(${2:args}) {\n    $0\n  }\n}", "класс", range),
          snip("import", "import ${1:name} from \"${2:module}\";", "import", range),
        ],
      };
    },
  });
};
