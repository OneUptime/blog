# Validation Summary: How to Use Named Collections in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (named collections feature)
- ClickHouse SQL DDL (CREATE / ALTER / DROP NAMED COLLECTION)
- ClickHouse XML server configuration (`config.d/`)
- ClickHouse GRANT / access control for named collections
- Integrations: S3, PostgreSQL, MySQL table functions and table engines
- `system.named_collections` system table

## Sources Consulted
- [ClickHouse Named Collections documentation](https://clickhouse.com/docs/operations/named-collections)
- [CREATE NAMED COLLECTION reference](https://clickhouse.com/docs/sql-reference/statements/create/named-collection)
- [GRANT statement reference](https://clickhouse.com/docs/sql-reference/statements/grant)
- [ClickHouse master docs on GitHub — operations/named-collections.md](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/operations/named-collections.md)
- [PR #46241 — Allow separate grants for every named collection](https://github.com/ClickHouse/ClickHouse/pull/46241)
- [Issue #50277 — grants access/use named collections](https://github.com/ClickHouse/ClickHouse/issues/50277)
- [ClickHouse 21.11 release presentation](https://presentations.clickhouse.com/release_21.11/)

## Issues Found

1. **Incorrect introduction version.** The post originally stated Named Collections were "introduced in ClickHouse 22.4." Named collections (XML-config based) were actually introduced in 21.11, and SQL DDL support (`CREATE NAMED COLLECTION`) was added in 22.12. Updated the sentence to: "introduced in ClickHouse 21.11 (with SQL DDL support added in 22.12)".

2. **Incorrect `GRANT NAMED COLLECTION` syntax.** The post used `GRANT NAMED COLLECTION s3_prod TO analyst_user;` and `GRANT NAMED COLLECTION * TO etl_service;`. Per the official GRANT reference, named collection grants require an `ON` clause, matching the form shown in the docs (`GRANT CREATE NAMED COLLECTION ON abc TO john`). Updated both lines to:
   - `GRANT NAMED COLLECTION ON s3_prod TO analyst_user;`
   - `GRANT NAMED COLLECTION ON * TO etl_service;`

All other SQL and XML examples (XML `<named_collections>` block, `CREATE NAMED COLLECTION`, `ALTER NAMED COLLECTION ... SET`, `DROP NAMED COLLECTION`, `system.named_collections` with `name` / `collection` columns, S3/PostgreSQL/MySQL table function and engine usage with named collections, `filename =` / `table =` keyword arguments) were verified against the official docs and are correct.

## Review Notes
- The `NAMED COLLECTION` usage privilege (as used in the access-control section) was introduced in 23.7. On older versions (22.12–23.6) the equivalent management privilege is `NAMED COLLECTION ADMIN` (alias `NAMED COLLECTION CONTROL`). The post does not spell this out, but since ClickHouse 23.7 has long been released, the syntax shown is current.
- `CREATE NAMED COLLECTION` and `system.named_collections` are not supported in ClickHouse Cloud as a self-service DDL; Cloud users should define named collections via the Cloud UI. Post does not mention this caveat, but it is not strictly incorrect.
- Example AWS credentials used (`AKIAIOSFODNN7EXAMPLE`, `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`) are the well-known AWS documentation placeholder values, not real credentials — safe to leave as-is.
