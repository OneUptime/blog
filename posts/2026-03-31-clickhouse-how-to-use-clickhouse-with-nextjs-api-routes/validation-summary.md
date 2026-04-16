# Validation Summary: How to Use ClickHouse with Next.js API Routes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Next.js (Pages Router and App Router)
- TypeScript
- Node.js
- `@clickhouse/client` official JavaScript client
- SWR (React data fetching)

## Sources Consulted
- ClickHouse official JavaScript client docs: https://clickhouse.com/docs/integrations/language-clients/javascript
- `@clickhouse/client` source — `ResultSet.json<T>()` type definitions in the clickhouse-js repo: https://github.com/ClickHouse/clickhouse-js
- Next.js official documentation for Pages Router (`pages/api`) and App Router (`app/api/**/route.ts`) handlers and `next/server` exports
- ClickHouse SQL reference for `count()`, `uniq()`, `INTERVAL ... DAY`, and parameterized queries (`{name:Type}` syntax)

## Issues Found
- The `createClient` config object used `host` as a property name. In the current `@clickhouse/client` API the parameter is `url`, not `host`. Updated the shared client snippet to use `url` (and renamed the env var to `CLICKHOUSE_URL` to match) so the example compiles against current client versions.

## Review Notes
- `result.json<PageViewRow>()` usage is correct. For `JSONEachRow`, the client's `json<T>()` resolves to `T[]`, so typing `T = PageViewRow` yields `PageViewRow[]` as used in the snippet.
- Numeric aggregates like `count()` and `uniq()` return `UInt64`, which serialize as strings over JSON — the post correctly types `views` and `unique_users` as `string` and converts with `Number()` before returning.
- The `{days:UInt8}` parameter syntax is valid ClickHouse parameterized-query syntax; note that `UInt8` caps `days` at 255, which is fine for the example but worth bumping to `UInt16`/`UInt32` for longer ranges.
- Module caching in Next.js means the singleton pattern in `lib/clickhouse.ts` works across requests within a single server instance, but in serverless deployments each cold start will create a new client — that's expected behavior, not a bug in the example.
- The App Router example intentionally omits try/catch for brevity; in production, wrap the query similarly to the Pages Router handler and consider adding `export const dynamic = 'force-dynamic'` or `revalidate` settings depending on caching needs.
