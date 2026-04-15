# Validation Summary: How to Build a TypeScript API with ClickHouse Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (via `@clickhouse/client` Node.js client)
- TypeScript
- Fastify (HTTP framework)
- Zod (input validation)
- Node.js

## Sources Consulted
- `@clickhouse/client` v1.10.1 TypeScript type definitions and exports (`dist/index.d.ts`, `@clickhouse/client-common` config types)
- Fastify v5 TypeScript type definitions (`types/instance.d.ts`) — confirmed callback-style `listen()` with options object is still supported in v5
- Fastify v5 Migration Guide — https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/
- ClickHouse documentation on `output_format_json_quote_64bit_integers` setting (defaults to 1, quoting only UInt64/Int64)
- Project's own `clickhouse-data-types-typescript` blog post which correctly maps Float64 → `number` and UInt64 → `string`

## Issues Found
1. **`avg_ms` typed as `string` instead of `number`**: The `avg()` function returns `Float64`, which ClickHouse serializes as a JSON number (not a string). Only 64-bit integers (UInt64, Int64) are quoted as strings by default (via `output_format_json_quote_64bit_integers=1`). Changed `avg_ms: string` to `avg_ms: number`.
2. **Overly broad comment on number serialization**: The comment `// ClickHouse returns numbers as strings in JSON` implied all numeric types are stringified. Updated to two precise per-field comments: `// UInt64 is quoted as a string in JSON by default` for `cnt` and `// Float64 is returned as a JSON number` for `avg_ms`.

## Review Notes
- The `@clickhouse/client` API usage (`createClient`, `ClickHouseClient` type, `query()` with `query_params`, `rs.json<T>()`, `ch.close()`) is all correct and current.
- The ClickHouse parameterized query syntax `{days:UInt32}` is correct for safe parameter binding.
- Zod's `z.coerce.number()` chain is correct for query parameter validation.
- Fastify's callback-style `listen({ port, host }, callback)` remains valid in v5 (only the old variadic positional-argument form was removed).
- The post correctly notes that Zod validation prevents injection, though ClickHouse's parameterized queries (`{name:Type}` syntax) already handle this at the database level.
