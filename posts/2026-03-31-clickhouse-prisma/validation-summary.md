# Validation Summary: How to Use ClickHouse with Prisma

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (columnar analytics database)
- `@clickhouse/client` (official ClickHouse Node.js client)
- Prisma ORM
- TypeScript
- PostgreSQL (as the OLTP backend behind Prisma)
- ClickHouse MySQL-compatible wire protocol (port 9004)

## Sources Consulted
- Official `@clickhouse/client` npm package and GitHub repository (`ClickHouse/clickhouse-js`) — verified `createClient`, `insert`, `query`, and `ResultSet.json()` APIs
- Official Prisma documentation — verified `PrismaClient`, `create`, `findUnique`, `$queryRaw`, `$queryRawUnsafe`, datasource provider values, and schema.prisma syntax
- ClickHouse documentation — verified HTTP interface port (8123) and MySQL wire-protocol port (9004)

## Issues Found
No technical issues found.

## Review Notes
- The `@clickhouse/client` API usage is fully correct: `createClient({ url, database })`, `ch.insert({ table, values, format })` with `'JSONEachRow'`, `ch.query({ query, query_params, format })` with `{days:UInt32}` parameter placeholder syntax, and `rs.json<T>()` for typed results.
- All Prisma patterns are correct: `PrismaClient` import, `.create({ data })`, `.findUnique({ where })`, `$queryRaw`, `$queryRawUnsafe`, and the `mysql` datasource provider.
- The claim that Prisma has no native ClickHouse connector is accurate. Prisma supports postgresql, mysql, sqlite, sqlserver, mongodb, and cockroachdb only.
- Port 9004 for ClickHouse's MySQL-compatible interface is correct for self-managed installations. ClickHouse Cloud uses port 3306 instead, but the blog's localhost context makes 9004 appropriate.
- The hybrid architecture pattern (Prisma for OLTP, separate ClickHouse client for analytics) is a sound and commonly recommended approach.
