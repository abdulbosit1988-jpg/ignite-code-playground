import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, Users, Terminal, Palette, Sparkles, Rocket } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const features = [
  { icon: Code2, title: "Monaco Editor", desc: "Тот же движок, что в VS Code. Автодополнение, подсветка, Tab-сниппеты." },
  { icon: Rocket, title: "Запуск проекта", desc: "HTML/CSS/JS в реальном превью. Python через Pyodide прямо в браузере." },
  { icon: Users, title: "Совместная работа", desc: "Поделись своим кодом-приглашением — друг присоединится в реальном времени." },
  { icon: Terminal, title: "Терминал", desc: "Встроенный эмулятор с поддержкой базовых команд и истории." },
  { icon: Palette, title: "Темы и пипетка", desc: "Меняй цветовую тему редактора одним кликом — авто или ручной выбор." },
  { icon: Sparkles, title: "Зум кода", desc: "Регулируй размер шрифта горячими клавишами и кнопками." },
];

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <header className="container flex items-center justify-between py-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold">Online Coding</span>
        </div>
        <nav className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard"><Button variant="default">Открыть лобби</Button></Link>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost">Войти</Button></Link>
              <Link to="/auth?mode=signup"><Button>Регистрация</Button></Link>
            </>
          )}
        </nav>
      </header>

      <section className="container relative z-10 pt-16 pb-24 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 text-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>PyCharm-style IDE прямо в браузере</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Кодируй <span className="text-gradient">вместе</span>,<br />где угодно
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Полноценная среда разработки в браузере. Создавай проекты на Python, JavaScript, HTML, CSS, Go и Java.
          Приглашай друзей по коду — работайте над кодом в реальном времени.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to={user ? "/dashboard" : "/auth?mode=signup"}>
            <Button size="lg" className="text-base shadow-[var(--shadow-glow)]">
              Начать бесплатно <Rocket className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <a href="#features"><Button size="lg" variant="outline">Узнать больше</Button></a>
        </div>
      </section>

      <section id="features" className="container relative z-10 pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Всё для кодинга в одном месте</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-xl p-6 hover:border-primary/50 transition-all hover:shadow-[var(--shadow-glow)]">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container relative z-10 py-8 border-t border-border text-center text-sm text-muted-foreground">
        © Online Coding · Built with Lovable
      </footer>
    </div>
  );
};

export default Index;
