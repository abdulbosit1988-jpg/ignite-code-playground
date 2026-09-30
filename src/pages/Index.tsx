import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Braces, Code2, Play, Sparkles, Terminal, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AmbientMotion } from "@/components/AmbientMotion";

const features = [
  { icon: Braces, title: "Умные подсказки", desc: "Автодополнение и Tab-сниппеты помогают писать код быстрее." },
  { icon: Play, title: "Мгновенный запуск", desc: "Запускай Python на месте, а сайты — в отдельной вкладке." },
  { icon: Users, title: "Вместе в реальном времени", desc: "Приглашай друзей по коду и работайте над одним проектом." },
  { icon: Terminal, title: "Всё под рукой", desc: "Редактор, файлы и терминал собраны в одном рабочем пространстве." },
];

const Index = () => {
  const { user } = useAuth();

  return (
    <main className="landing-shell min-h-screen overflow-hidden">
      <AmbientMotion />

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
        <header className="glass-panel flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Online Coding — главная">
            <span className="brand-mark"><Code2 className="h-5 w-5" /></span>
            <span className="font-heading truncate text-base font-bold sm:text-lg">Online Coding</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2" aria-label="Основная навигация">
          {user ? (
            <Button asChild size="sm" className="rounded-xl"><Link to="/dashboard">Лобби <ArrowRight /></Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-xl"><Link to="/auth">Войти</Link></Button>
              <Button asChild size="sm" className="rounded-xl"><Link to="/auth?mode=signup">Регистрация</Link></Button>
            </>
          )}
          </nav>
        </header>

        <section className="mt-4 grid gap-4 lg:grid-cols-12" aria-labelledby="landing-title">
          <div className="glass-panel hero-panel flex min-h-[510px] flex-col justify-between p-6 sm:p-10 lg:col-span-8 lg:min-h-[610px] lg:p-14">
            <div>
              <div className="eyebrow"><Sparkles className="h-4 w-4" /> IDE прямо в браузере</div>
              <h1 id="landing-title" className="font-heading mt-8 max-w-4xl text-4xl font-bold leading-[1.08] sm:text-6xl lg:text-7xl">
                Кодируй вместе.<br /><span className="text-gradient">Создавай свободно.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Пиши Python, JavaScript, HTML, CSS, Go и Java. Запускай проекты, получай умные подсказки и работай с друзьями в реальном времени.
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 rounded-2xl px-7 text-base">
                <Link to={user ? "/dashboard" : "/auth?mode=signup"}>{user ? "Открыть лобби" : "Начать бесплатно"}<ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 rounded-2xl border-glass bg-glass/30 px-7 text-base hover:bg-glass/50">
                <a href="#features">Посмотреть возможности</a>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            <div className="glass-panel code-preview min-h-[250px] overflow-hidden p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="preview-dot bg-destructive" /><span className="preview-dot bg-warning" /><span className="preview-dot bg-success" /></div>
                <span className="font-heading text-[10px] text-muted-foreground">hello.py</span>
              </div>
              <pre className="overflow-hidden text-xs leading-7 sm:text-sm"><code><span className="syntax-purple">def</span> <span className="syntax-blue">create</span>(idea):{"\n"}  project = <span className="syntax-green">"Online Coding"</span>{"\n"}  <span className="syntax-purple">return</span> idea + project{"\n\n"}<span className="syntax-muted"># твоя идея начинается здесь</span></code></pre>
              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><span className="status-pulse" /> Готово к запуску</div>
            </div>

            <div className="glass-panel flex min-h-[250px] flex-col justify-between p-6">
              <div>
                <p className="font-heading text-lg font-bold">Работайте вместе</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Один код приглашения — и команда уже в проекте.</p>
              </div>
              <div className="collab-stack mt-8" aria-hidden="true"><span>A</span><span>B</span><span>+</span></div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Возможности">
          {features.map((feature) => (
            <article key={feature.title} className="glass-panel feature-tile p-6">
              <span className="feature-icon"><feature.icon className="h-5 w-5" /></span>
              <h2 className="font-heading mt-8 text-base font-bold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </article>
          ))}
        </section>

        <footer className="flex flex-col items-center justify-between gap-2 px-2 pb-24 pt-8 text-center text-xs text-muted-foreground sm:flex-row sm:pb-8 sm:text-left">
          <span className="font-heading">Online Coding</span>
          <span>© {new Date().getFullYear()} Создано для идей, которые хочется запустить.</span>
        </footer>
      </div>
    </main>
  );
};

export default Index;
