# Validation Summary: How to Configure ClickHouse for GDPR Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse MergeTree and ReplacingMergeTree engines
- ClickHouse lightweight deletes and ALTER DELETE mutations
- ClickHouse TTL retention policies
- GDPR data deletion, anonymization, DSAR export, consent tracking, and audit logging patterns

## Sources Consulted
- ClickHouse Docs: The Lightweight DELETE Statement - https://clickhouse.com/docs/sql-reference/statements/delete
- ClickHouse Docs: Delete mutations - https://clickhouse.com/docs/managing-data/delete_mutations
- ClickHouse Docs: ALTER TABLE ... UPDATE Statements - https://clickhouse.com/docs/sql-reference/statements/alter/update
- ClickHouse Docs: Manage data with TTL - https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse Docs: MergeTree table engine TTL syntax - https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse Docs: CREATE VIEW and parameterized views - https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse Docs: ReplacingMergeTree table engine and FINAL behavior - https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse Docs: argMax aggregate function - https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax
- ClickHouse Docs: String splitting and arrayStringConcat functions - https://clickhouse.com/docs/sql-reference/functions/splitting-merging-functions
- ClickHouse Docs: Session settings, enable_lightweight_delete - https://clickhouse.com/docs/operations/settings/settings

## Issues Found
- The lightweight delete setup used the older alias `allow_experimental_lightweight_delete`. Changed it to the current documented setting name `enable_lightweight_delete` and added a caveat that lightweight deletes physically remove rows later during merges.
- The IP masking expression used `position(ip_address, '.', 3)`, which searches from character position 3 rather than finding the third octet boundary reliably. Replaced it with a `splitByChar`/`arraySlice`/`arrayStringConcat` expression that masks IPv4 addresses as intended.
- The conditional TTL example placed `WHERE level != 'ERROR'` after a multi-rule TTL list and still deleted all rows after 30 days, so it did not keep errors longer. Reordered the rules and added explicit `DELETE WHERE` clauses for non-error and error rows.
- The DSAR example created a `UNION ALL` view with `SELECT *` from tables that are unlikely to have identical schemas. Replaced it with separate parameterized exports using `FORMAT JSONEachRow`.
- The consent query read directly from a `ReplacingMergeTree` table, which can return superseded rows before background merges deduplicate them. Replaced the join target with an `argMax(..., granted_at)` tuple aggregation to query the latest consent state without losing nullable `revoked_at` values.

## Review Notes
ClickHouse SQL examples are now aligned with current official syntax and documented behavior. For production GDPR programs, legal compliance still depends on data mapping, storage policies, backups, replication, authorization, and operational controls outside these SQL snippets.
