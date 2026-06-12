# Validation Summary: How to Implement Context Evaluation

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Feature flag evaluation and targeting
- TypeScript
- Python
- Express
- cookie-parser
- js-cookie
- uuid
- Zod
- Redis / redis-py
- HTTP cookies
- Semantic version comparison

## Sources Consulted
- Express cookie-parser middleware documentation: https://expressjs.com/en/resources/middleware/cookie-parser/
- TypeScript declaration merging documentation: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
- js-cookie documentation: https://github.com/js-cookie/js-cookie
- uuid npm package documentation: https://www.npmjs.com/package/uuid
- Zod API documentation: https://zod.dev/api
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- MDN Set-Cookie documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie

## Issues Found
- The TypeScript snippets imported `ContextBuilder` and `EvaluationContext` from `./context`, but the context snippet did not export them. Added exports for the context interfaces, type, and builder class.
- The custom attributes snippet used `EvaluationContext` without importing it. Added a type import from `./context`.
- The anonymous context snippet attempted to export `AnonymousContext` as a runtime value even though it is a TypeScript interface. Changed it to a type-only export.
- The Python evaluator raised `ValueError` for unknown operators instead of failing closed. Added a guard that returns `false` for unsupported operator names.
- The Python rollout evaluator could index an empty distribution. Added a default-variation fallback for empty rollout distributions.
- The Python bucket calculation divided by `0xFFFFFFFF`, which can produce exactly 100 for the maximum 32-bit hash value. Changed the divisor to `0x100000000` so buckets stay in the `[0, 100)` range.
- The Python semantic version parser compared tuples of uneven length and did not ignore build metadata or prerelease suffixes. Updated it to compare padded numeric version parts after removing build/prerelease suffixes.
- The cache key generation and Redis serialization used `json.dumps` without handling date-like values or dataclass results. Added `default=str`.
- The Redis cache used `setex`, which redis-py documents as deprecated in favor of `SET` with `EX`. Replaced it with `set(..., ex=ttl_seconds)`.
- The optimized TypeScript evaluator compiled `rollout` data but did not evaluate flag-level rollout distributions, so the pricing experiment example always returned the default variation. Added rollout support to `CompiledFlag` and `evaluate`.
- The optimized TypeScript evaluator could throw while compiling invalid regular expressions. Wrapped `new RegExp(...)` in a try/catch and made invalid regex matchers return false.
- The integration example imported the Python `context-cache.py` implementation from TypeScript. Replaced that with a small TypeScript in-memory cache in the example.
- The Express example used `req.cookies` without registering `cookie-parser`. Added the `cookie-parser` import and `app.use(cookieParser())`.
- The Express example assigned `req.flagContext` without extending the Express request type. Added TypeScript declaration merging for the custom request property.
- The server-side anonymous cookie helper always emitted `Secure`, which can prevent cookies from being set over plain HTTP outside localhost. Added a `secure` parameter and passed `req.secure` from the Express example.
- The performance diagram listed specific `10x`, `5x`, and `3x` speedup claims without benchmark context. Replaced the numeric claims with qualitative optimization labels.

## Review Notes
The snippets are illustrative and split across Python and TypeScript implementations, so they are not a single copy-pasteable application. Syntax checks were run against all Python and TypeScript code blocks after edits. The remaining semantic version examples implement a basic numeric SemVer-style comparison and do not fully implement the SemVer prerelease ordering specification.
