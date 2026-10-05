import { onRequest } from "./functions/api/[[path]].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const path = url.pathname
        .replace(/^\/api\/?/, "")
        .split("/")
        .filter(Boolean);

      try {
        return await onRequest({
          request,
          env,
          params: { path },
          waitUntil: ctx.waitUntil.bind(ctx)
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: {
              code: "WORKER_API_ERROR",
              message: String(error?.message || error)
            }
          }),
          {
            status: 500,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store"
            }
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
