# Validation Summary: How to Build a GraphQL API on Top of ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, parameterized queries, `formatDateTime`, `uniq`, `count`)
- GraphQL (schema definition language, scalar types)
- Apollo Server v4 (`@apollo/server`, `startStandaloneServer`)
- `@clickhouse/client` (official Node.js ClickHouse client)
- `graphql-tag` (`gql` template literal)
- Node.js / JavaScript

## Sources Consulted
- ClickHouse `formatDateTime` docs — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#formatdatetime
- ClickHouse parameterized queries — https://clickhouse.com/docs/en/interfaces/cli#cli-queries-with-parameters
- Apollo Server v4 docs — https://www.apollographql.com/docs/apollo-server/
- Apollo Server v4 standalone server — https://www.apollographql.com/docs/apollo-server/api/standalone/
- `@clickhouse/client` npm / GitHub — https://github.com/ClickHouse/clickhouse-js
- `graphql-tag` — https://www.npmjs.com/package/graphql-tag

## Issues Found
No technical issues found.

All checked items are correct:
- Apollo Server v4 import paths (`@apollo/server`, `@apollo/server/standalone`), constructor signature, and `startStandaloneServer` usage are accurate.
- `gql` is correctly imported from `graphql-tag` (Apollo Server v4 no longer bundles `gql`).
- `@clickhouse/client` usage (`client.query({ query, query_params, format })` and `result.json()`) matches the official client API.
- ClickHouse parameterized query syntax `{name:Type}` with `query_params` is correct.
- `formatDateTime` format string `'%Y-%m-%dT%H:%i:%s'` uses the correct minute specifier `%i` for modern ClickHouse (v23.4+). Note: `%M` changed meaning to "full month name" in v23.4, so `%i` is the safe, current choice.
- GraphQL SDL types (`Int`, `Float`, `String`, `[Event]`, non-null `!`) are valid.
- SQL aggregates (`count()`, `uniq()`, `avg()`) and date helpers (`toDate`, `today()`) are valid ClickHouse functions.

## Review Notes
- `uniq()` and `count()` return `UInt64` in ClickHouse, but the post casts them to `UInt32` for GraphQL `Int` compatibility. GraphQL `Int` is a signed 32-bit integer (max ~2.1B), so values above ~2.1B would still overflow the `Int` scalar. For very large cardinality analytics, teams may want a custom `BigInt`/`String` scalar. This is a minor design consideration, not an error.
- The Setup section installs `@types/node` and `typescript` as dev dependencies, but the sample code is plain JavaScript (`.js`). Not technically wrong — the TS types are optional and harmless — but slightly inconsistent.
- `client` in `resolvers.js` is imported from `./db`, which is not shown. That is a reasonable omission for brevity.
- No deprecation warnings or version-specific caveats beyond the `%M` → `%i` note above.
