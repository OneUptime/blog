# How to Move One SaaS Tenant to a New Data Region with Minimal Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Residency, Database Migration, SaaS, PostgreSQL, Region Migration

Description: Migrate one tenant with an initial copy, controlled change capture, a fenced cutover, and a clear rollback boundary after destination writes begin.

---

Moving one SaaS tenant between regions is a coordinated ownership change. Copying tables and updating DNS is insufficient: workers can still write to the old database, queue messages can arrive late, and object files may be missing from the destination.

Minimal downtime normally means copying most data while the source serves traffic, then briefly stopping writes to complete a verified cutover. The exact interruption depends on the workload and migration mechanism; a region move should not promise uninterrupted writes without a tested protocol.

## Define the Migration's Full Scope

Inventory relational rows, objects, search indexes, queue state, idempotency records, sessions, scheduled jobs, and audit data. Identify global references and cross-tenant relationships that cannot be moved independently.

Record the source, destination, approved transfer path, encryption, retention, and deletion obligations. A temporary staging bucket is another data destination. Microsoft notes that moving tenants between [deployment stamps](https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp) requires application logic to transfer and remove their information; stamp isolation does not supply a migration protocol.

Use explicit states such as `copying`, `catching_up`, `fenced`, `active_at_destination`, and `retiring_source`. Keep the migration operation ID and placement version durable so a controller restart can reconcile progress.

## Prepare the Destination Before Copying

Deploy compatible application and database schemas, extensions, credentials, quotas, and backup configuration. Ensure destination workers cannot start consuming tenant jobs prematurely. Test connectivity without exposing the destination as an active writer.

Choose a tenant-scoped export or replication mechanism and prove its filtering. For PostgreSQL 18, a publication can use row filters, but each relevant table needs the correct filter. The columns used by filters for published `UPDATE` and `DELETE` operations must be covered by the replica identity. Filters do not scope `TRUNCATE` to a tenant. See [logical replication row filters](https://www.postgresql.org/docs/18/logical-replication-row-filter.html).

For an illustrative `orders` table whose primary key includes `tenant_id`, a publication could be:

```sql
CREATE PUBLICATION move_tenant_42
FOR TABLE public.orders WHERE (tenant_id = 42)
WITH (publish = 'insert, update, delete');
```

This is one table, not a complete migration configuration. Add every dependent table deliberately; never assume a publication filter protects unrelated tables or subscription privileges. Keep the migration subscription limited to the intended publications: filters for the same table across multiple publications are combined with OR, and an unfiltered publication can expose every tenant. A subscriber older than PostgreSQL 15 also does not apply row filters during the initial copy. Verify the exact [CREATE PUBLICATION rules](https://www.postgresql.org/docs/18/sql-createpublication.html) and row-filter behavior for both server versions.

## Establish a Consistent Copy and Change Stream

Use a migration mechanism that coordinates the initial snapshot with its change-capture position. An arbitrary dump followed by “start replication now” can miss changes between the two operations.

Track copy completion, replication errors, and retained source logs. A stalled consumer can retain enough WAL to exhaust the source disk. Bound retries and define a cancellation procedure that also releases unused replication slots.

PostgreSQL logical replication does not copy DDL, sequence state, or large objects. Prepare schemas separately, plan sequence synchronization before enabling destination writes, and handle unsupported data explicitly. These are documented [logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html), not issues that disappear when replication lag reaches zero.

## Fence Every Source Writer

Pause interactive writes and stop tenant jobs, exports, and scheduled work. Drain active transactions. Then enforce a durable source-side write fence that rejects new operations for the old placement version.

A routing change alone is not a fence: cached routes, pooled connections, and administrators can bypass it. Have every participating writer check tenant ownership in the same transactional boundary as its mutation, or use another enforceable database-level mechanism appropriate to the tenancy model.

After the fence completes, capture the final source position and wait for the destination to apply it. Verify table synchronization as well as stream progress. Check tenant row counts, key ranges, business totals, object versions, and deletion tombstones. A transport acknowledgment is not proof that all application state is usable.

## Activate One Owner

Update placement through a controlled version change. Enable destination writes only after the source is fenced and the destination has passed its checks. Release destination workers with the new version, invalidate old routing caches, and reject delayed work carrying the old version.

Use durable idempotency records for operations whose response might have been lost around cutover. Observe application success, error rate, queue lag, and business-level consistency during the transition.

## Set the Rollback Boundary

Before the destination accepts writes, rollback can usually mean abandoning the destination and reopening the fenced source after verifying ownership. Once destination writes begin, simply switching traffic back loses or forks those writes.

Post-cutover rollback requires a separately designed reverse synchronization or reconciliation process and another fence. Otherwise, keep the destination authoritative and repair forward.

Retain source copies only for the approved recovery period, then remove them through a documented process. Track backups, snapshots, search copies, and exports independently. A successful region move ends when serving ownership, recovery behavior, and the source-data retirement record all agree.
