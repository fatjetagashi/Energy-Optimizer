import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// Gjatë testimit mund të lësh "*".
// Kur ta kesh domenin e Netlify, zëvendëso me: "https://emri-yt.netlify.app"
const ALLOWED_ORIGIN = "*";

function withCORS(resp: Response) {
  const h = new Headers(resp.headers);
  h.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(resp.body, { status: resp.status, headers: h });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    // Preflight CORS
    return withCORS(new Response(null, { status: 204 }));
  }

  const { pathname } = new URL(req.url);

  // Endpoint prove
  if (pathname === "/hello") {
    return withCORS(
      new Response(JSON.stringify({ ok: true, msg: "Hello from Deno!" }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  return withCORS(new Response("Not found", { status: 404 }));
});
