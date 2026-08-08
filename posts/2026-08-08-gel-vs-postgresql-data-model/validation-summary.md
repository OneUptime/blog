# Validation Summary: Gel vs PostgreSQL: When Is the Higher-Level Model Worth It?

## Status

validated

## Post Type

Architectural comparison / decision guide

## Technologies Covered

- Gel (formerly EdgeDB)
- Gel Schema Definition Language (SDL)
- EdgeQL
- PostgreSQL and SQL
- Gel's PostgreSQL-compatible SQL adapter
- PostGIS
- Gel access policies and globals
- Gel migrations and client code generation

## Sources Consulted

- Gel documentation — Welcome to Gel: https://docs.geldata.com/
- Gel documentation — Object types: https://docs.geldata.com/reference/datamodel/objects
- Gel documentation — Properties: https://docs.geldata.com/reference/datamodel/properties
- Gel documentation — Links: https://docs.geldata.com/reference/datamodel/links
- Gel documentation — EdgeQL `select`: https://docs.geldata.com/reference/edgeql/select
- Gel documentation — Access policies: https://docs.geldata.com/reference/datamodel/access_policies
- Gel documentation — Globals: https://docs.geldata.com/reference/datamodel/globals
- Gel documentation — TypeScript queries generator: https://docs.geldata.com/reference/using/js/queries
- Gel documentation — TypeScript query builder generator: https://docs.geldata.com/reference/clients/js/for
- Gel documentation — Migrations: https://docs.geldata.com/reference/datamodel/migrations
- Gel documentation — SQL adapter: https://docs.geldata.com/reference/using/sql_adapter
- Gel documentation — Extensions: https://docs.geldata.com/reference/datamodel/extensions
- Gel documentation — PostGIS: https://docs.geldata.com/reference/stdlib/postgis
- Gel changelog — EdgeDB 3.0 SQL support: https://docs.geldata.com/resources/changelog/3_x
- Gel changelog — Gel 6.0 SQL writes and PostGIS: https://docs.geldata.com/resources/changelog/6_x
- Gel changelog — Gel 7.0: https://docs.geldata.com/resources/changelog/7_x
- Gel documentation — Health checks and metrics: https://docs.geldata.com/reference/running/http
- Gel announcement — Gel joins Vercel: https://www.geldata.com/blog/gel-joins-vercel
- PostgreSQL documentation — Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL documentation — Table expressions and joins: https://www.postgresql.org/docs/current/queries-table-expressions.html
- PostgreSQL documentation — JSON functions and operators: https://www.postgresql.org/docs/current/functions-json.html
- PostgreSQL documentation — UUID functions: https://www.postgresql.org/docs/current/functions-uuid.html

## Issues Found

- The PostgreSQL ecosystem section incorrectly implied that Gel 6 introduced the PostgreSQL-compatible SQL interface. Read-only SQL over the PostgreSQL protocol was introduced in EdgeDB 3.0; Gel 6 added SQL data modification and PostGIS. Updated the sentence to attribute only PostGIS and SQL data modification to Gel 6.
- The SQL adapter section likewise said Gel 6 introduced PostgreSQL protocol support. Updated it to state that Gel 6 extended the existing PostgreSQL-protocol SQL interface with a subset of data modification support.
- The warning about direct catalog or table changes could be read as including supported `INSERT`, `UPDATE`, and `DELETE` statements sent through Gel's SQL adapter. Clarified that the unsafe operation is bypassing Gel and changing the backing PostgreSQL catalog or tables directly.

## Review Notes

- The Gel SDL and EdgeQL examples are valid under the current Gel 7 documentation. The omitted `property` and `link` keywords, typed links, computed backlink, cardinality modifiers, nested shape, UUID parameter cast, filter, and ordering syntax are all supported.
- The PostgreSQL DDL is valid. Unlike Gel's automatically assigned object IDs, these PostgreSQL tables require callers to supply UUID values because the columns have no defaults. Adding `DEFAULT gen_random_uuid()` would provide database-side generation, but the example is correct as written.
- Gel 7 changed the SQL adapter so access policies apply by default. The post makes no claim about that adapter setting, so no correction was needed.
- Gel announced that Gel Cloud would shut down on January 31, 2026. The post does not claim that a first-party managed Gel service remains available and correctly frames its operational comparison around self-hosting.
