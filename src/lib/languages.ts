import pythonLogo from "@/assets/lang-python.png";
import htmlLogo from "@/assets/lang-html.png";
import goLogo from "@/assets/lang-go.png";
import jsLogo from "@/assets/lang-javascript.png";
import javaLogo from "@/assets/lang-java.png";

export type LangKey = "python" | "html" | "css" | "javascript" | "go" | "java" | "text";

export interface LangConfig {
  key: LangKey;
  name: string;
  ext: string;
  color: string;
  icon: string;
  image?: string;
  runnable: boolean;
  starter: string;
}

export const LANGUAGES: LangConfig[] = [
  {
    key: "python", name: "Python", ext: "py", color: "text-syntax-blue", icon: "🐍", image: pythonLogo, runnable: true,
    starter: `# Привет, Python!\nprint("Hello, World!")\nfor i in range(3):\n    print(f"i = {i}")\n`,
  },
  {
    key: "html", name: "HTML", ext: "html", color: "text-syntax-orange", icon: "🌐", image: htmlLogo, runnable: true,
    starter: `<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>Edit me and press Run.</p>\n</body>\n</html>\n`,
  },
  {
    key: "css", name: "CSS", ext: "css", color: "text-syntax-purple", icon: "🎨", runnable: true,
    starter: `body { font-family: sans-serif; background: #0f172a; color: #fff; padding: 2rem; }\nh1 { color: #22c55e; }\n`,
  },
  {
    key: "javascript", name: "JavaScript", ext: "js", color: "text-syntax-yellow", icon: "⚡", image: jsLogo, runnable: true,
    starter: `// Hello, JS!\nconsole.log("Hello, World!");\nfor (let i = 0; i < 3; i++) console.log("i =", i);\n`,
  },
  {
    key: "go", name: "Go", ext: "go", color: "text-syntax-blue", icon: "🐹", image: goLogo, runnable: false,
    starter: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n`,
  },
  {
    key: "java", name: "Java", ext: "java", color: "text-syntax-orange", icon: "☕", image: javaLogo, runnable: false,
    starter: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
  },
  {
    key: "text", name: "Text", ext: "txt", color: "text-muted-foreground", icon: "📄", runnable: false,
    starter: ``,
  },
];

export const guessLangByName = (name: string): LangKey => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, LangKey> = {
    py: "python", html: "html", htm: "html", css: "css", js: "javascript", mjs: "javascript",
    go: "go", java: "java", txt: "text", md: "text", json: "javascript",
  };
  return map[ext] || "text";
};

export const EDITOR_THEMES = [
  { key: "vs-dark", name: "VS Dark", color: "#1e1e1e" },
  { key: "hc-black", name: "High Contrast", color: "#000000" },
  { key: "dracula", name: "Dracula", color: "#282a36" },
  { key: "monokai", name: "Monokai", color: "#272822" },
  { key: "github-dark", name: "GitHub Dark", color: "#0d1117" },
  { key: "solarized", name: "Solarized", color: "#002b36" },
];
