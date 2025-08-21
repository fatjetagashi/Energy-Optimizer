import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const ALLOWED_ORIGIN = "*"; // për test. Më vonë vendose domainin e Netlify

function withCORS(resp: Response) {
  const h = new Headers(resp.headers);
  h.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(resp.body, { status: resp.status, headers: h });
}

serve(async (req) => {
  const { method } = req;
  const { pathname } = new URL(req.url);

  if (method === "OPTIONS") {
    return withCORS(new Response(null, { status: 204 }));
  }

  if (pathname === "/hello") {
    if (method === "GET") {
      return withCORS(new Response(JSON.stringify({ ok: true, msg: "Hello from Deno!" }), {
        headers: { "Content-Type": "application/json" }
      }));
    }
    if (method === "POST") {
      const data = await req.json().catch(() => null);
      if (!data) {
        return withCORS(new Response(JSON.stringify({ error: "Empty body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }));
      }
      return withCORS(new Response(JSON.stringify({ ok: true, received: data }), {
        headers: { "Content-Type": "application/json" }
      }));
    }
  }

  return withCORS(new Response("Not found", { status: 404 }));
});
