# Validation Summary: How to Use ClickHouse with Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface on port 8123)
- Deno runtime
- TypeScript
- `@clickhouse/client-web` (official web client, imported via Deno `npm:` specifier)
- Oak (Deno HTTP server framework)
- ClickHouse `JSONEachRow` format

## Sources Consulted
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse formats docs (`JSONEachRow`): https://clickhouse.com/docs/en/interfaces/formats
- `@clickhouse/client-web` package docs / README: https://clickhouse.com/docs/en/integrations/language-clients/javascript and https://github.com/ClickHouse/clickhouse-js
- Deno `npm:` specifier docs: https://docs.deno.com/runtime/manual/node/npm_specifiers
- Oak framework: https://deno.land/x/oak

## Issues Found
No technical issues found.

## Review Notes
- The Oak import `https://deno.land/x/oak/mod.ts` is unversioned. It works, but pinning to a specific tag (e.g. `oak@v12.6.1`) is the documented best practice for reproducible builds. Left as-is since it is not incorrect.
- The GET-based query approach (`url.searchParams.set('query', sql)`) is fine for short queries; for long SQL, POSTing the body is preferable due to URL length limits. Not an error — just a future improvement.
- The `insert()` helper sends `Content-Type: application/json` with NDJSON (one JSON object per line). ClickHouse relies on the `FORMAT JSONEachRow` clause in the URL rather than the Content-Type header, so this works correctly.
- `createClient({ url, ... })` uses the current option name (`url`); older versions of the client used `host`, which would be incorrect in recent releases. The post uses the right one.
- Description refers to "Node.js compatibility mode," while `@clickhouse/client-web` is the Web variant that relies on standard Web APIs available natively in Deno. The phrasing is loose but not a code/technical error, so left unchanged.
