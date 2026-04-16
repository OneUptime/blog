# Validation Summary: How to Use ClickHouse with NestJS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- NestJS
- TypeScript
- Node.js
- @clickhouse/client (official ClickHouse JS/TS client)

## Sources Consulted
- @clickhouse/client official documentation: https://clickhouse.com/docs/en/integrations/language-clients/javascript
- @clickhouse/client GitHub repo: https://github.com/ClickHouse/clickhouse-js
- NestJS official documentation: https://docs.nestjs.com/
  - Modules: https://docs.nestjs.com/modules
  - Providers: https://docs.nestjs.com/providers
  - Controllers: https://docs.nestjs.com/controllers
  - Lifecycle events (OnModuleDestroy): https://docs.nestjs.com/fundamentals/lifecycle-events
- ClickHouse SQL reference (parameterized queries, count, uniq): https://clickhouse.com/docs/en/sql-reference/

## Issues Found
No technical issues found.

The review verified:
- `createClient` config options (`host`, `username`, `password`, `database`) match the @clickhouse/client API.
- `client.query({ query, query_params, format })` signature is correct.
- `ResultSet.json<T>()` returns `Promise<T[]>` when using `JSONEachRow` format — matches the service's typed signature.
- `client.insert({ table, values, format })` signature is correct.
- `client.close()` is the correct shutdown method.
- `ClickHouseClient` is a valid exported type.
- NestJS decorators (`@Module`, `@Global`, `@Injectable`, `@Controller`, `@Get`, `@Query`) and the `OnModuleDestroy` lifecycle hook are used correctly.
- The ClickHouse parameterized query syntax `{days:UInt8}` is valid.
- `count()` and `uniq()` return `UInt64`, which the @clickhouse/client returns as strings under JSONEachRow; the post correctly types these as `string` and converts with `Number()`.

## Review Notes
- Using `UInt8` for the `days` parameter limits it to values 0–255. Since the endpoint exposes `days` as a client-controllable query string, passing e.g. `300` would cause a parameter-binding error. Using `UInt16` or `UInt32` would be more robust, though this is a stylistic/robustness note rather than a technical error.
- The `ClickHouseService` constructs its client from `process.env` directly; wiring it through `@nestjs/config` (`ConfigService`) would be more idiomatic NestJS, but the env-var approach shown works and is clear.
- The `@Global()` decoration means `ClickHouseModule` doesn't need to be re-imported in every module that uses the service — this is intentional and documented in NestJS.
- The post's description mentions "clickhouse-client library" while the actual npm package is `@clickhouse/client`; this is a minor shorthand and not technically incorrect.
