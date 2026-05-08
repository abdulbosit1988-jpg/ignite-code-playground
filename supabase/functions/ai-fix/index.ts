const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language, mode = "fix", instruction = "", prefix = "", suffix = "" } = await req.json();
    if (typeof code !== "string" && mode !== "complete") {
      return new Response(JSON.stringify({ error: "code and language required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!language) {
      return new Response(JSON.stringify({ error: "language required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "No AI key configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let userPrompt = "";
    let systemPrompt = "Ты — эксперт-программист и дружелюбный ИИ-помощник. Когда тебя просят исправить или сгенерировать код — отвечай ТОЛЬКО кодом, без markdown ```блоков``` и без пояснений. Когда просят объяснить или задают любой вопрос — отвечай подробно и понятно на русском, можешь использовать markdown и блоки кода.";

    if (mode === "fix") {
      userPrompt = `Исправь все ошибки в этом коде на языке ${language}. Верни ТОЛЬКО исправленный полный код без объяснений, без markdown-блоков, без комментариев о том, что было исправлено. Только чистый рабочий код:\n\n${code}`;
    } else if (mode === "explain") {
      userPrompt = `Объясни подробно на русском что делает этот код (${language}):\n\n${code}`;
    } else if (mode === "generate") {
      userPrompt = `Напиши код на ${language} по этому заданию: ${instruction}\n\nТекущий код (можно использовать как контекст):\n${code}\n\nВерни ТОЛЬКО код без объяснений и markdown.`;
    } else if (mode === "ask") {
      systemPrompt = "Ты — дружелюбный, умный ИИ-помощник для программистов. Отвечай на любые вопросы пользователя на русском языке, подробно и по существу. Если просят код — приводи код в markdown-блоках с указанием языка. Если вопрос общий — отвечай свободно. Никогда не отказывай в ответе.";
      const ctx = code ? `\n\nКонтекст — текущий код пользователя (${language}):\n\`\`\`${language}\n${code}\n\`\`\`` : "";
      userPrompt = `${instruction}${ctx}`;
    } else if (mode === "complete") {
      systemPrompt = `Ты — IDE автодополнение в стиле GitHub Copilot для языка ${language}. Тебе дают prefix (код до курсора) и suffix (код после курсора). Ты возвращаешь ТОЛЬКО короткий фрагмент кода (1-5 строк), который должен быть вставлен в позицию курсора. Никаких объяснений, никакого markdown, никаких комментариев. Только готовый кусок кода, который натурально продолжит prefix и согласуется с suffix. Если очевидного продолжения нет — верни пустую строку.`;
      userPrompt = `<prefix>\n${prefix}\n</prefix>\n<suffix>\n${suffix}\n</suffix>`;
    } else {
      userPrompt = `${instruction}\n\nКод (${language}):\n${code}\n\nВерни только код.`;
    }

    const maxTokens = mode === "complete" ? 160 : (mode === "ask" ? 4096 : 2048);
    const temperature = mode === "complete" ? 0.1 : (mode === "ask" ? 0.7 : 0.3);

    let result = "";

    // Приоритет — бесплатный Google Gemini API (если есть ключ)
    if (GEMINI_API_KEY) {
      const geminiModel = mode === "complete" ? "gemini-2.0-flash-lite" : "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      });

      if (!resp.ok) {
        const t = await resp.text();
        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: "Gemini: превышен лимит бесплатной версии. Попробуй чуть позже." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Fallback на Lovable AI если есть
        if (!LOVABLE_API_KEY) {
          return new Response(JSON.stringify({ error: "Gemini error: " + t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        const data = await resp.json();
        result = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      }
    }

    // Fallback / основной путь — Lovable AI Gateway
    if (!result && LOVABLE_API_KEY) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: mode === "complete" ? "google/gemini-2.5-flash-lite" : "google/gemini-3-flash-preview",
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
      result = data.choices?.[0]?.message?.content ?? "";
    }

    if (mode !== "explain" && mode !== "ask") {
      result = result.replace(/^```[a-zA-Z]*\n?/m, "").replace(/```\s*$/m, "").trim();
    }

    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
