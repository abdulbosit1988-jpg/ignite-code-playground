// Monaco snippet/completion providers for HTML and Python.
// Registered once globally — guarded by a module-level flag.
let registered = false;

const PYTHON_API_DOCS = [
  ["print", "print(value, ..., sep=' ', end='\\n') — вывод в консоль"],
  ["len", "len(obj) — длина строки, списка, словаря и других коллекций"],
  ["range", "range(stop) / range(start, stop, step) — диапазон чисел"],
  ["str", "str(value) — преобразование в строку"],
  ["int", "int(value) — преобразование в целое число"],
  ["float", "float(value) — преобразование в число с точкой"],
  ["list", "list(iterable) — список"],
  ["dict", "dict() — словарь"],
  ["set", "set(iterable) — множество"],
  ["tuple", "tuple(iterable) — кортеж"],
  ["open", "open(path, mode='r', encoding='utf-8') — открыть файл"],
  ["input", "input(prompt='') — чтение строки от пользователя"],
  ["requests", "requests.get/post/... — HTTP запросы"],
  ["json", "json.loads / json.dumps — работа с JSON"],
  ["datetime", "datetime.now() / date.today() — дата и время"],
  ["os", "os.listdir / os.path.join — работа с файловой системой"],
  ["pathlib", "Path('file').read_text() — современная работа с путями"],
  ["math", "math.sqrt / math.pi / math.sin — математические функции"],
] as const;

export const registerSnippets = (monaco: any) => {
  if (registered) return;
  registered = true;

  const html = (label: string, insert: string, doc?: string) => ({
    label, kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: insert, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: doc,
  });

  // HTML snippets
  monaco.languages.registerCompletionItemProvider("html", {
    triggerCharacters: ["<", "!", " "],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const tags = ["header", "main", "section", "article", "nav", "aside", "footer", "button", "input", "form", "video", "audio", "img", "a", "div", "span", "canvas"];
      const attrs = ["class", "id", "src", "href", "alt", "title", "rel", "type", "name", "placeholder", "controls", "autoplay", "loop", "muted", "width", "height"];

      return ({
      suggestions: [
        html("!", [
          "<!DOCTYPE html>",
          "<html lang=\"en\">",
          "<head>",
          "  <meta charset=\"UTF-8\" />",
          "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />",
          "  <title>${1:Document}</title>",
          "</head>",
          "<body>",
          "  $0",
          "</body>",
          "</html>",
        ].join("\n"), "Шаблон HTML5"),
        html("div", "<div${1: class=\"$2\"}>$0</div>"),
        html("a", "<a href=\"${1:#}\">$0</a>"),
        html("img", "<img src=\"${1:src}\" alt=\"${2:alt}\" />"),
        html("link:css", "<link rel=\"stylesheet\" href=\"${1:style.css}\" />"),
        html("script:src", "<script src=\"${1:app.js}\"></script>"),
        html("ul>li", "<ul>\n  <li>$1</li>\n  <li>$2</li>\n</ul>"),
        html("table", "<table>\n  <thead><tr><th>$1</th></tr></thead>\n  <tbody><tr><td>$2</td></tr></tbody>\n</table>"),
        html("form", "<form action=\"${1:#}\" method=\"${2:post}\">\n  $0\n</form>"),
        html("input", "<input type=\"${1:text}\" name=\"${2:name}\" placeholder=\"${3}\" />"),
        html("button", "<button type=\"${1:button}\">$0</button>"),
        html("h1", "<h1>$0</h1>"),
        html("p", "<p>$0</p>"),
        html("video", "<video src=\"${1:video.mp4}\" controls></video>"),
        html("audio", "<audio src=\"${1:audio.mp3}\" controls></audio>"),
        ...tags.map((tag) => ({
          label: tag,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: tag,
          documentation: `HTML тег <${tag}>`,
          range,
        })),
        ...attrs.map((attr) => ({
          label: attr,
          kind: monaco.languages.CompletionItemKind.Property,
          insertText: `${attr}=\"$1\"`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: `HTML атрибут ${attr}`,
          range,
        })),
      ],
      });
    },
  });

  // Python snippets
  const py = (label: string, insert: string, doc?: string) => ({
    label, kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: insert, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: doc,
  });
  monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", " "],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return ({
      suggestions: [
        py("print", "print(${1:value})"),
        py("def", "def ${1:name}(${2:args}):\n    ${0:pass}"),
        py("class", "class ${1:Name}:\n    def __init__(self${2:, args}):\n        ${0:pass}"),
        py("if", "if ${1:condition}:\n    ${0:pass}"),
        py("ifelse", "if ${1:condition}:\n    ${2:pass}\nelse:\n    ${0:pass}"),
        py("for", "for ${1:i} in ${2:iterable}:\n    ${0:pass}"),
        py("forr", "for ${1:i} in range(${2:10}):\n    ${0:pass}"),
        py("while", "while ${1:condition}:\n    ${0:pass}"),
        py("try", "try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    ${0:pass}"),
        py("with", "with open(${1:'file.txt'}, '${2:r}') as f:\n    ${0:pass}"),
        py("import", "import ${1:module}"),
        py("from", "from ${1:module} import ${0:name}"),
        py("main", "if __name__ == \"__main__\":\n    ${0:main()}"),
        py("lambda", "lambda ${1:x}: ${0:x}"),
        py("list comp", "[${1:x} for ${2:x} in ${3:iterable}]"),
        py("dict comp", "{${1:k}: ${2:v} for ${3:k}, ${4:v} in ${5:items}}"),
        py("requests.get", "import requests\nr = requests.get(\"${1:https://}\")\nprint(r.text)"),
        py("numpy", "import numpy as np\narr = np.array([${1:1, 2, 3}])"),
        py("pandas", "import pandas as pd\ndf = pd.read_csv(\"${1:data.csv}\")"),
        py("async def", "async def ${1:name}(${2:args}):\n    ${0:pass}"),
        py("list.sort", "${1:items}.sort(key=${2:None}, reverse=${3:False})"),
        py("dict.get", "${1:data}.get(${2:'key'}, ${3:None})"),
        py("pathlib read", "from pathlib import Path\ntext = Path('${1:file.txt}').read_text(encoding='utf-8')"),
        py("pathlib write", "from pathlib import Path\nPath('${1:file.txt}').write_text(${2:text}, encoding='utf-8')"),
        py("json load", "import json\nwith open('${1:file.json}', 'r', encoding='utf-8') as f:\n    data = json.load(f)"),
        py("json dump", "import json\nwith open('${1:file.json}', 'w', encoding='utf-8') as f:\n    json.dump(${2:data}, f, ensure_ascii=False, indent=2)"),
        ...PYTHON_API_DOCS.map(([label, documentation]) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: label,
          documentation,
          range,
        })),
      ],
      });
    },
  });
};
