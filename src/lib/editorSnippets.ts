// Monaco snippet/completion providers for HTML and Python.
// Registered once globally — guarded by a module-level flag.
let registered = false;

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
    provideCompletionItems: () => ({
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
      ],
    }),
  });

  // Python snippets
  const py = (label: string, insert: string, doc?: string) => ({
    label, kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: insert, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: doc,
  });
  monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", " "],
    provideCompletionItems: () => ({
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
      ],
    }),
  });
};
