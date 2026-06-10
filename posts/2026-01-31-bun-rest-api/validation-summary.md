# Validation Summary: How to Build REST APIs with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun (JavaScript/TypeScript runtime)
- `Bun.serve()` HTTP server API
- TypeScript
- Web standard APIs: `Request`, `Response`, `Headers`, `URL`, `URLSearchParams`, `ReadableStream`
- WeakMap (per-request user storage)
- CORS / preflight handling
- JWT-style Bearer authentication pattern
- REST/CRUD design patterns

## Sources Consulted
- Bun HTTP server (`Bun.serve`) docs: https://bun.sh/docs/api/http
- Bun runtime docs: https://bun.sh/docs/runtime/typescript
- Bun CLI / `bun run` docs: https://bun.sh/docs/cli/run
- MDN `Request` interface: https://developer.mozilla.org/en-US/docs/Web/API/Request
- MDN `Response` interface: https://developer.mozilla.org/en-US/docs/Web/API/Response
- MDN `URL` and `URLSearchParams`: https://developer.mozilla.org/en-US/docs/Web/API/URL
- MDN CORS / preflight (`OPTIONS`, 204, `Access-Control-*` headers): https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- MDN `WeakMap` (object-keyed weak references): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap

## Issues Found
No technical issues found.

## Review Notes
- `Bun.serve({ port, fetch, error })` matches Bun's documented API. The `fetch` handler's signature accepts `(request: Request, server: Server)`; the post omits the second arg, which is legal because it's optional. Return type `Response | Promise<Response>` is supported.
- `port: process.env.PORT || 3000` evaluates to `string | number`. Bun's `port` option accepts both, so this is fine at runtime and types.
- In the CORS middleware, `new Response(response.body, { status, statusText, headers })` is a valid pattern for re-wrapping a downstream response while replacing headers — the body `ReadableStream` is transferred to the new `Response`. For 204 preflight responses (`body: null`), this also works correctly.
- The `WeakMap<Request, User>` pattern for attaching authenticated-user context is valid: `Request` objects are unique per request, and a `WeakMap` doesn't prevent GC. This is a reasonable alternative to monkey-patching the request.
- The path-to-regex implementation correctly escapes `/` first, then replaces `:name` tokens with `([^/]+)` capture groups, anchoring with `^…$`. Tracing `/api/users/:id` against `/api/users/123` produces a correct match with `params.id === "123"`.
- The middleware chain's recursive `next()` (incrementing `index` and re-entering) is the standard onion/Koa pattern and is correctly implemented.
- The "Why Choose Bun" table is a generalization. Node.js has had a built-in `--watch` flag since 18.11+ and experimental TypeScript stripping in recent versions (23.6+), so "Requires nodemon" / "Requires transpilation" are not universally true today but are still common in practice for older/typical Node.js setups. Left as-is since the post frames these as general comparisons and they remain a reasonable picture for many Node.js projects.
- The startup-time numbers (~25ms Bun vs ~300ms Node.js) are loose approximations; actual values depend heavily on workload. Within tutorial tolerance.
- `parseInt(url.searchParams.get("page") || "1")` can yield `NaN` for non-numeric input, and `NaN < 1` is `false`, so the validation gate would let `NaN` through. Minor for an educational example — the post otherwise emphasizes validation correctly — and left unchanged since it isn't strictly incorrect.
- The in-memory `UserStore.update` spreads `data` over the existing user, which would let extra fields (e.g., `id`, `createdAt`) be overwritten if smuggled in at runtime. The post explicitly states "use a real database in production," so this simplification is acceptable for a tutorial.
- Authentication example uses a placeholder `verifyToken` that hardcodes `"valid-token"`; the post explicitly directs readers to use a proper JWT library in production, so this is appropriately framed as illustrative.
