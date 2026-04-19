import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().trim().email("Некорректный email").max(255),
  password: z.string().min(6, "Минимум 6 символов").max(72),
  display_name: z.string().trim().min(1, "Введите имя").max(50).optional(),
});

const Auth = () => {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parse = schema.safeParse({ email, password, display_name: mode === "signup" ? name : undefined });
    if (!parse.success) { toast.error(parse.error.issues[0].message); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { display_name: name } },
        });
        if (error) throw error;
        toast.success("Аккаунт создан! Входим...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("С возвращением!");
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Ошибка");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded-2xl p-8 shadow-[var(--shadow-elegant)] animate-fade-in">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold">Online Coding</span>
        </Link>
        <h1 className="text-2xl font-bold text-center mb-1">{mode === "signup" ? "Создать аккаунт" : "Вход"}</h1>
        <p className="text-center text-muted-foreground text-sm mb-6">
          {mode === "signup" ? "Начни кодить за 30 секунд" : "Рады снова видеть"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван" required />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <Label htmlFor="password">Пароль</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "signup" ? "Зарегистрироваться" : "Войти"}
          </Button>
        </form>

        <p className="text-sm text-center mt-6 text-muted-foreground">
          {mode === "signup" ? "Уже есть аккаунт?" : "Нет аккаунта?"}{" "}
          <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-primary hover:underline">
            {mode === "signup" ? "Войти" : "Создать"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
