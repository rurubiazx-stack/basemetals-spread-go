import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/quotes")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { buildQuotes } = await import("@/lib/quotes.server");
          const payload = await buildQuotes();
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch (e) {
          console.error("[quotes] 函数执行失败", (e as Error).message);
          return new Response(JSON.stringify({ error: "quotes unavailable" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
