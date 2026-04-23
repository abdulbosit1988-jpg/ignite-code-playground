const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language, mode = "fix", instruction = "" } = await req.json();
    if (typeof code !== "string" || !language) {
      return new Response(JSON.stringify({ error: "code and language required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let userPrompt = "";
    if (mode === "fix") {
      userPrompt = `Исправь все ошибки в этом коде на языке ${language}. Верни ТОЛЬКО исправленный полный код без объяснений, без markdown-блоков, без комментариев о том, что было исправлено. Только чистый рабочий код:\n\n${code}`;
    } else if (mode === "explain") {
      userPrompt = `Объясни кратко на русском что делает этот код (${language}):\n\n${code}`;
    } else if (mode === "generate") {
      userPrompt = `Напиши код на ${language} по этому заданию: ${instruction}\n\nТекущий код (можно использовать как контекст):\n${code}\n\nВерни ТОЛЬКО код без объяснений и markdown.`;
    } else {
      userPrompt = `${instruction}\n\nКод (${language}):\n${code}\n\nВерни только код.`;
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Ты — эксперт-программист. Когда тебя просят исправить или сгенерировать код, отвечай ТОЛЬКО кодом, без markdown ```блоков``` и без пояснений. Когда просят объяснить — отвечай кратко на русском." },
          { role: "user", content: userPrompt },
        ],
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
    // Strip markdown code fences if present
    if (mode !== "explain") {
      result = result.replace(/^```[a-zA-Z]*\n?/m, "").replace(/```\s*$/m, "").trim();
    }

    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
