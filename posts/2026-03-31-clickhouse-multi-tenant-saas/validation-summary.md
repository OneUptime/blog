# Validation Summary: How to Build a Multi-Tenant Analytics SaaS with ClickHouse

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- ClickHouse (MergeTree engine, row policies, quotas, TTL, partitioning)
- SQL (DDL: CREATE TABLE, CREATE USER, CREATE ROW POLICY, CREATE QUOTA, ALTER TABLE)
- Multi-tenant SaaS architecture patterns
- GDPR data erasure via partition management

## Sources Consulted
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse PARTITION BY documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse ALTER TABLE DROP PARTITION documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse CREATE ROW POLICY documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/row-policy
- ClickHouse CREATE QUOTA documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/quota
- ClickHouse TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse system.parts documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree

## Issues Found

1. **PARTITION BY was composite but post assumed per-tenant partitions.**
   - **What was wrong:** `PARTITION BY (tenant_id, toYYYYMM(ts))` creates one partition per tenant per month. However, the text stated "each tenant's data lands in its own partition" and subsequent examples (DROP PARTITION, system.parts GROUP BY tenant_id) assumed a single partition per tenant.
   - **What was changed:** Changed to `PARTITION BY tenant_id` so each tenant's data resides in one partition, consistent with the rest of the post.
   - **Why:** With the composite key, `DROP PARTITION` could not remove all of a tenant's data in a single command, and the system.parts storage query could not group by tenant. The per-tenant partitioning aligns with the post's GDPR erasure and billing use cases.

2. **DROP PARTITION ID 'tenant_42' was invalid syntax.**
   - **What was wrong:** The partition ID for a `UInt32` value of 42 is `'42'`, not `'tenant_42'`. Additionally, `DROP PARTITION ID` expects a string partition ID, while `DROP PARTITION` expects the partition key value directly.
   - **What was changed:** Changed `DROP PARTITION ID 'tenant_42'` to `DROP PARTITION 42`.
   - **Why:** ClickHouse partition IDs are derived from the partition key value, not from a named convention. `DROP PARTITION 42` correctly matches the `PARTITION BY tenant_id` key.

3. **system.parts query referenced non-existent `tenant_id` column.**
   - **What was wrong:** The `system.parts` table does not have a `tenant_id` column. The query used `SELECT tenant_id ... GROUP BY tenant_id` which would fail.
   - **What was changed:** Changed to `SELECT partition AS tenant_id` since the `partition` column in `system.parts` holds the string representation of the partition key value (i.e., the tenant_id).
   - **Why:** `system.parts` exposes partition information via the `partition` and `partition_id` columns, not via the original column names from the partitioned table.

4. **ORDER BY on formatted string gave incorrect sort order.**
   - **What was wrong:** `ORDER BY compressed DESC` sorted the `formatReadableSize()` output alphabetically (e.g., "9.99 KiB" would sort above "1.00 GiB").
   - **What was changed:** Changed to `ORDER BY sum(data_compressed_bytes) DESC` to sort by the raw numeric byte count.
   - **Why:** Sorting by the human-readable formatted string does not produce a meaningful size-based ordering.

## Review Notes
- The per-tenant TTL with WHERE clauses is a valid but less commonly documented ClickHouse feature. Explicitly adding the `DELETE` keyword before each `WHERE` (e.g., `DELETE WHERE tenant_id IN (...)`) would improve clarity, though it is optional since DELETE is the default TTL action.
- The "Automating Row Policy Creation" section uses `{id}` placeholder syntax that is presented as a template for programmatic DDL generation. This is fine as pseudocode but readers should note it is not valid ClickHouse parameterized query syntax (which uses `{param:Type}`).
- With `PARTITION BY tenant_id`, tenants with very high data volume will produce large partitions. For production deployments with extreme data volumes per tenant, a composite key like `(tenant_id, toYYYYMM(ts))` may be preferable, but would require adjusting the DROP PARTITION and storage queries accordingly.
- The row policy example is correct and uses the permissive policy type (default). Readers should be aware that once a row policy is assigned to a user on a table, that user can only see rows matching the policy condition — but other users without any policy can still see all rows.
