# Validation Summary: How to Use Elysia Framework with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime
- Elysia web framework
- TypeScript
- TypeBox schema validation
- @elysiajs/cors plugin
- @elysiajs/swagger plugin (OpenAPI)
- @elysiajs/jwt plugin
- @elysiajs/static plugin
- WebSockets (Elysia / Bun)
- REST API patterns
- JWT authentication (access + refresh tokens)

## Sources Consulted
- Elysia Life-cycle docs — https://elysiajs.com/essential/life-cycle.html
- Elysia Validation docs — https://elysiajs.com/essential/validation.html
- Elysia WebSocket pattern — https://elysiajs.com/patterns/websocket.html
- Elysia Plugin docs — https://elysiajs.com/essential/plugin.html
- @elysiajs/swagger plugin docs — https://elysiajs.com/plugins/swagger.html
- @elysiajs/static plugin docs — https://elysiajs.com/plugins/static.html
- @elysiajs/jwt plugin docs — https://elysiajs.com/plugins/jwt.html
- @elysiajs/cors plugin docs — https://elysiajs.com/plugins/cors.html
- Bun init CLI docs — https://bun.com/docs/cli/init

## Issues Found
- **`onResponse` vs `onAfterResponse`**: The middleware section used `.onResponse(...)` for the post-response hook, while the custom-plugin section used the current canonical name `.onAfterResponse(...)`. Standardized on `onAfterResponse` in both the middleware code example and the corresponding mermaid lifecycle diagram to match current Elysia naming and stay internally consistent.

## Review Notes
- TypeBox helpers used in the post (`t.Object`, `t.String`, `t.Number`, `t.Numeric`, `t.Optional`, `t.Union`, `t.Literal`, `t.Array`, `t.Boolean`, `t.Partial`) are all valid; `t.Numeric` is Elysia's coercing variant for query/param strings and is used correctly.
- Swagger plugin default path is `/swagger`; the "Complete API Example" relies on this default, and its closing log message (`/swagger`) is consistent. The earlier OpenAPI example correctly overrides this with `path: "/docs"`.
- WebSocket `ws()` handler validation fields (`body` for messages, `query` for connection params) and `ws.subscribe` / `ws.publish` / `ws.unsubscribe` / `ws.send` usage match Elysia's documented WebSocket pattern.
- JWT plugin `exp` accepts human-readable durations like `"15m"` and `"7d"`, as used in the auth example.
- `bun init -y` is a valid command for non-interactive scaffolding.
- Static plugin options `assets` and `prefix` are correct (defaults: `"public"` and `"/public"`; the example overrides `prefix` to `/static`).
- The post's pattern of one plugin using `.derive()` to add `user` to context and a subsequent plugin reading that `user` in its own `.derive()` works because Elysia propagates type inference and decorators across chained `.use()` calls — this is documented behavior.
- The post uses the chainable interceptor method names (`.onTransform`, `.onBeforeHandle`, `.onAfterHandle`, `.onError`, `.onRequest`, `.onParse`) which is the correct API for app-level hooks. The inline-route `transform({ body }) {...}` form (used in custom-validation.ts) is also valid, since route-option hook properties drop the `on` prefix — both styles in the post align with Elysia conventions.
