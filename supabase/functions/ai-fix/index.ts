const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code = "", language = "plaintext", mode = "fix", instruction = "", prefix = "", suffix = "" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let userPrompt = "";
    let systemPrompt = "Ты — эксперт-программист. Когда тебя просят исправить или сгенерировать код — отвечай ТОЛЬКО кодом, без markdown ```блоков``` и пояснений. Когда просят объяснить или задают вопрос — отвечай подробно на русском, используй markdown и блоки кода.";

    if (mode === "fix") {
      userPrompt = `Исправь все ошибки в этом коде на языке ${language}. Верни ТОЛЬКО исправленный полный код без объяснений и markdown-блоков:\n\n${code}`;
    } else if (mode === "explain") {
      userPrompt = `Объясни подробно на русском что делает этот код (${language}). Используй markdown с заголовками и списками:\n\n${code}`;
    } else if (mode === "generate") {
      userPrompt = `Напиши код на ${language} по заданию: ${instruction}\n\nТекущий код как контекст:\n${code}\n\nВерни ТОЛЬКО код, без объяснений и markdown.`;
    } else if (mode === "ask") {
      systemPrompt = "Ты — дружелюбный, умный ИИ-помощник для программистов. Отвечай на любые вопросы на русском подробно и по существу. Если просят код — приводи его в markdown-блоках с указанием языка. Никогда не отказывай в ответе.";
      const ctx = code ? `\n\nКонтекст — текущий код пользователя (${language}):\n\`\`\`${language}\n${code}\n\`\`\`` : "";
      userPrompt = `${instruction}${ctx}`;
    } else if (mode === "complete") {
      systemPrompt = `Ты — IDE автодополнение в стиле GitHub Copilot для языка ${language}. Возвращай ТОЛЬКО короткий фрагмент кода (1-5 строк), который вставляется в позицию курсора между prefix и suffix. Никаких объяснений и markdown. Если очевидного продолжения нет — пустую строку.`;
      userPrompt = `<prefix>\n${prefix}\n</prefix>\n<suffix>\n${suffix}\n</suffix>`;
    } else {
      userPrompt = `${instruction}\n\nКод (${language}):\n${code}`;
    }

    const maxTokens = mode === "complete" ? 160 : (mode === "ask" || mode === "explain" ? 4096 : 2048);
    const temperature = mode === "complete" ? 0.1 : (mode === "ask" ? 0.7 : 0.3);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: mode === "complete" ? "google/gemini-2.5-flash-lite" : "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Слишком много запросов. Попробуй чуть позже." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Закончились AI-кредиты. Пополни в настройках workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      return new Response(JSON.stringify({ error: "AI gateway error: " + t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    let result: string = data.choices?.[0]?.message?.content ?? "";

    if (mode !== "explain" && mode !== "ask") {
      result = result.replace(/^```[a-zA-Z]*\n?/m, "").replace(/```\s*$/m, "").trim();
    }

    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
