# Validation Summary: How to Design a Multi-Tenant Schema in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, partitioning, row policies, TTL)
- SQL (DDL statements, ALTER TABLE)
- Multi-tenant database design patterns

## Sources Consulted
- [MergeTree Table Engine - TTL syntax](https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree) - verified TTL DELETE WHERE syntax
- [ALTER TABLE TTL](https://clickhouse.com/docs/sql-reference/statements/alter/ttl) - confirmed DELETE keyword requirement
- [Manage Data with TTL - Developer Guide](https://clickhouse.com/docs/guides/developer/ttl) - verified conditional TTL patterns
- [CREATE ROW POLICY](https://clickhouse.com/docs/sql-reference/statements/create/row-policy) - verified row policy syntax and USING clause limitations
- [Query Parameters](https://clickhouse.com/docs/guides/developer/stored-procedures-and-prepared-statements) - confirmed query parameters are not supported in DDL row policies
- [Manipulating Partitions and Parts](https://clickhouse.com/docs/sql-reference/statements/alter/partition) - verified DROP PARTITION tuple syntax
- [Custom Partitioning Key](https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key) - verified composite partition key support and partition count warnings
- [Choosing a Partitioning Key - Best Practices](https://clickhouse.com/docs/best-practices/choosing-a-partitioning-key) - verified partition count limits
- [Choose a Low Cardinality Partitioning Key](https://clickhouse.com/docs/optimize/partitioning-key) - confirmed recommended partition count < 1,000
- [Altinity KB: How to Pick Keys](https://kb.altinity.com/engines/mergetree-table-engine-family/pick-keys/) - confirmed tenant_id in PARTITION BY is discouraged for high cardinality

## Issues Found

### 1. TTL expression missing DELETE keyword (line 59)
**What was wrong:** The TTL modification used `MODIFY TTL event_time + INTERVAL 90 DAY WHERE tenant_id = 42` without the required `DELETE` action keyword before the `WHERE` clause. This is a syntax error in ClickHouse.
**What was changed:** Added `DELETE` keyword: `MODIFY TTL event_time + INTERVAL 90 DAY DELETE WHERE tenant_id = 42`.
**Why:** ClickHouse TTL syntax requires an explicit action (`DELETE`, `RECOMPRESS`, `TO DISK`, `TO VOLUME`) before the `WHERE` clause. Without it, the statement fails.

### 2. DROP PARTITION syntax incorrect for composite key (line 71)
**What was wrong:** Used `DROP PARTITION (42, 202501)` which is not valid syntax for composite partition keys.
**What was changed:** Changed to `DROP PARTITION tuple(42, 202501)`.
**Why:** ClickHouse requires the `tuple()` function for DROP PARTITION with composite partition keys. Bare parenthesized values are not accepted.

### 3. Row policy used unsupported query parameter syntax (lines 46-48)
**What was wrong:** The row policy used `{current_tenant_id:UInt32}` query parameter syntax in the USING clause. Query parameters (`{param:Type}`) are a query-time feature and are not supported in DDL statements like CREATE ROW POLICY.
**What was changed:** Changed to a concrete per-tenant policy example (`USING tenant_id = 42 TO tenant_42_role`) with updated text explaining that you create one policy per tenant, or use `currentUser()` / `dictGet()` for dynamic resolution.
**Why:** Row policy USING clauses are stored as static SQL expressions. They support column references, built-in functions like `currentUser()`, dictionary lookups via `dictGet()`, and literal values, but not client-supplied query parameters.

### 4. Inaccurate scalability claim in summary (line 96)
**What was wrong:** The summary claimed the approach "scales well for hundreds of tenants." With `PARTITION BY (tenant_id, toYYYYMM(event_time))`, hundreds of tenants multiplied by months of data would produce thousands of partitions, exceeding ClickHouse's recommended limit of ~1,000 partitions.
**What was changed:** Added a caveat that tenant_id in the partition key should only be used with a small number of tenants (under ~50), and for larger tenant counts, partition by time only and rely on the primary index.
**Why:** ClickHouse documentation explicitly warns against overly granular partitions and recommends staying under ~1,000 total partitions. 200 tenants x 12 months = 2,400 partitions, which causes performance degradation and can trigger "Too many parts" errors.

## Review Notes
- The composite `PARTITION BY (tenant_id, toYYYYMM(event_time))` strategy shown in the CREATE TABLE example is technically valid SQL but is a risky design recommendation. ClickHouse best practices recommend partitioning by time only for most use cases and placing tenant_id in the ORDER BY key for efficient filtering. The post's example remains valid for small tenant counts, and the corrected summary now clarifies this limitation.
- The ReplacingMergeTree usage for the tenants metadata table is correct and appropriate for deduplication use cases.
- The overall architectural advice (shared table with tenant_id in ORDER BY, row-level security, TTL management) is sound and well-aligned with ClickHouse multi-tenant best practices.
