function rewriteAssetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

function assetPath(pathname) {
  if (pathname === "/" || pathname === "/index.html") return "/client/";
  if (pathname === "/beacon" || pathname === "/beacon/") return "/client/beacon/";
  if (pathname === "/projects" || pathname === "/projects/") return "/client/projects/";
  if (
    pathname.startsWith("/_astro/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/models/")
  ) {
    return `/client${pathname}`;
  }
  return pathname;
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clientKey(request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  return `rate:${ip}`;
}

function leadRoute(source, intent) {
  const text = `${source || ""} ${intent || ""}`.toLowerCase();
  if (text.includes("beacon")) return "beacon";
  if (text.includes("consult")) return "consultation";
  if (text.includes("project")) return "lead";
  return "lead";
}

async function sendNotification(env, lead) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;

  const lines = [
    `New Applied AI Solutions intake`,
    ``,
    `Intent: ${lead.intent}`,
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Company: ${lead.company || "Not provided"}`,
    `Source: ${lead.source}`,
    `Route: ${lead.route}`,
    `Received: ${lead.createdAt}`,
    ``,
    lead.message,
  ];

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM || "Applied AI Solutions <intake@appliedai.solutions>",
      to: [env.NOTIFY_EMAIL],
      reply_to: lead.email,
      subject: `[AAS:${lead.route.toUpperCase()}] New AAS intake: ${lead.intent}`,
      headers: {
        "X-AAS-Route": lead.route,
        "X-AAS-Lead-Source": lead.source,
        "X-AAS-Lead-Id": lead.id,
      },
      text: lines.join("\n"),
    }),
  });
}

async function handleIntake(request, env, ctx) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, { status: 405 });
  }
  if (!env.LEADS) {
    return jsonResponse(
      { ok: false, error: "Intake storage is not configured yet." },
      { status: 503 },
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse(
      { ok: false, error: "Please submit the contact form fields." },
      { status: 400 },
    );
  }
  if (cleanText(form.get("website"), 120)) {
    return jsonResponse({ ok: true });
  }

  const rateKey = clientKey(request);
  const prior = await env.LEADS.get(rateKey);
  if (prior) {
    return jsonResponse(
      { ok: false, error: "Please wait a minute before sending another note." },
      { status: 429 },
    );
  }

  const lead = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    intent: cleanText(form.get("intent"), 120) || "Website Intake",
    source: cleanText(form.get("source"), 60) || "site",
    name: cleanText(form.get("name"), 120),
    email: cleanText(form.get("email"), 180).toLowerCase(),
    company: cleanText(form.get("company"), 140),
    message: cleanText(form.get("message"), 2400),
    userAgent: cleanText(request.headers.get("user-agent"), 220),
  };
  lead.route = leadRoute(lead.source, lead.intent);

  if (!lead.name || !isEmail(lead.email) || lead.message.length < 8) {
    return jsonResponse(
      { ok: false, error: "Name, email, and a short note are required." },
      { status: 400 },
    );
  }

  await env.LEADS.put(`lead:${lead.createdAt}:${lead.id}`, JSON.stringify(lead), {
    metadata: {
      intent: lead.intent,
      source: lead.source,
      route: lead.route,
      email: lead.email,
      createdAt: lead.createdAt,
    },
  });
  await env.LEADS.put(rateKey, "1", { expirationTtl: 60 });
  ctx?.waitUntil?.(sendNotification(env, lead));

  return jsonResponse({ ok: true, id: lead.id });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/intake") {
      return handleIntake(request, env, ctx);
    }
    return env.ASSETS.fetch(rewriteAssetRequest(request, assetPath(url.pathname)));
  },
};
