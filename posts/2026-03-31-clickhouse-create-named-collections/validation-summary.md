# Validation Summary: How to Create Named Collections in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (DDL: CREATE / ALTER / DROP NAMED COLLECTION)
- ClickHouse Access Control (GRANT / REVOKE)
- ClickHouse system tables (`system.named_collections`)
- Integrations: S3, PostgreSQL, MySQL, Kafka, remote/remoteSecure

## Sources Consulted
- ClickHouse docs — CREATE NAMED COLLECTION: https://clickhouse.com/docs/sql-reference/statements/create/named-collection
- ClickHouse docs — Named Collections operations guide: https://clickhouse.com/docs/operations/named-collections
- ClickHouse docs — GRANT statement (NAMED COLLECTION privileges): https://clickhouse.com/docs/sql-reference/statements/grant
- ClickHouse docs — system.named_collections: https://clickhouse.com/docs/operations/system-tables/named_collections
- ClickHouse integration test for named collection access control: tests/integration/test_named_collections/test.py

## Issues Found
- The GRANT/REVOKE examples used incorrect syntax. ClickHouse requires the `ON <collection_name|*>` clause for named-collection privileges; the post had `GRANT NAMED COLLECTION my_s3 TO alice;` (missing `ON`) and used database-style `*.*` for `CREATE/DROP NAMED COLLECTION`, which is not valid because these privileges are at the `NAMED_COLLECTION` level (single `*` wildcard, not `*.*`). Fixed all five statements in the "ACCESS MANAGEMENT and Permissions" section to use the correct `GRANT/REVOKE <priv> ON <name|*> TO/FROM <user>` form, verified against the official GRANT docs and the `test_named_collections` integration test.

## Review Notes
- The CREATE / ALTER / DROP NAMED COLLECTION syntax, the `OVERRIDABLE` / `NOT OVERRIDABLE` semantics, the `ON CLUSTER` clause, the table-function and table-engine usage examples (S3, PostgreSQL, MySQL, Kafka, remoteSecure), and the `system.named_collections` columns (`name`, `collection`) all match the official ClickHouse documentation.
- Note for readers: SQL-managed named collections are not supported in ClickHouse Cloud (per the official docs); on Cloud you would configure them differently. The post does not mention this caveat but it is not technically incorrect — left as-is per the "fix only technical errors" rule.
- The example AWS keys (`AKIAIOSFODNN7EXAMPLE` / `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`) are AWS's documented placeholder credentials, so they are appropriate for examples.
