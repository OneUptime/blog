# Migrate Hive Metastore Tables to Unity Catalog Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Unity Catalog, Hive Metastore, DBFS, Data Migration, Data Governance, Delta Lake

Description: A dependency-first migration plan for Hive tables, hard-coded names, DBFS mounts, permissions, and views.

---

Moving a table from `hive_metastore` to Unity Catalog is rarely just a metadata operation. The table name changes from a workspace-local two-level identity to an account-governed three-level identity, storage access moves behind Unity Catalog, and consumers inherit a different privilege model.

A technically successful `SYNC` or `DEEP CLONE` can still break jobs because a notebook contains `hive_metastore.sales.orders`, a library reads `/mnt/raw/orders`, or a view crosses a metastore boundary Unity Catalog does not permit. The safe migration unit is therefore a dependency group, not an isolated table.

This runbook begins with discovery, chooses the right migration mechanism per table, and keeps the old objects available until every read and write path has been exercised.

## Understand the Namespace Change

Legacy Hive metastore objects are addressed as:

```text
hive_metastore.<schema>.<table>
```

Unity Catalog objects use:

```text
<catalog>.<schema>.<table>
```

The similarity hides important differences. The built-in Hive metastore is workspace-local. Unity Catalog is attached at the account level and uses account identities and groups. Access to a table normally requires `USE CATALOG`, `USE SCHEMA`, and an object privilege such as `SELECT` or `MODIFY`, whether directly granted or inherited.

Do not rely on an unqualified name such as `sales.orders` during migration. Its resolution depends on the current or default catalog. Use three-level names until the cutover is complete and make catalog selection explicit in jobs, SQL warehouses, dbt targets, and notebooks.

## Inventory Objects and Their Physical Storage

Build a manifest before selecting a tool. At minimum record:

- fully qualified source and target names;
- table type, format, owner, size, and location;
- whether a managed table lives in DBFS root or external cloud storage;
- readers, writers, streaming checkpoints, and service principals;
- view dependencies and function dependencies;
- grants, group types, and ownership expectations;
- retention, table properties, constraints, and row-count baselines.

Start with supported metadata commands:

```sql
SHOW SCHEMAS IN hive_metastore;
SHOW TABLES IN hive_metastore.sales;
DESCRIBE EXTENDED hive_metastore.sales.orders;
DESCRIBE DETAIL hive_metastore.sales.orders;
SHOW GRANTS ON TABLE hive_metastore.sales.orders;
```

The physical `location` matters. A managed Hive table in workspace storage cannot be moved with `SYNC`. An external table can often be registered in Unity Catalog without copying its data, provided a Unity Catalog storage credential and external location cover that path.

Classify tables into migration waves based on dependency edges. Move foundational tables before views and consumers that reference them. Keep bidirectional writers out of the plan: during cutover, one authoritative object should accept writes.

## Find Hard-Coded Table Names Beyond SQL Files

Search the complete delivery surface, not only notebooks. Common hiding places include:

- SQL strings in Python, Scala, Java, and R;
- `spark.table`, `saveAsTable`, `insertInto`, and `toTable` calls;
- dbt sources, models, snapshots, seeds, macros, tests, and hooks;
- job and Lakeflow pipeline definitions;
- Databricks Asset Bundle YAML and variables;
- BI semantic models, dashboards, alerts, and SQL queries;
- orchestration parameters and environment variables;
- table comments, documentation, and operational runbooks.

A repository search can seed the inventory:

```bash
rg -n --hidden \
  'hive_metastore\.|spark\.sql|spark\.table|saveAsTable|insertInto|toTable' \
  .
```

Also search two-level names such as `sales.orders`. They may resolve to Hive today because of a workspace default and silently resolve elsewhere after the default catalog changes.

Repository search cannot find saved workspace queries or job parameters stored outside Git. Export or query those objects with supported workspace tooling, and inspect query history during a representative business cycle. Treat runtime lineage as evidence, not as a complete dependency graph, because rarely executed paths might not appear.

Create an explicit mapping that code can consume:

```yaml
tables:
  hive_metastore.sales.orders: prod.sales.orders
  hive_metastore.sales.customers: prod.sales.customers
```

Centralized mappings make rollback and environment-specific catalogs easier than scattered string replacements.

## Find and Replace DBFS Mount Dependencies

DBFS mounts and DBFS root are deprecated patterns. A path such as `/mnt/raw/orders` bypasses the Unity Catalog object that is supposed to govern the data. It can also be hidden behind `dbfs:/mnt/...` or `/dbfs/mnt/...` syntax.

Search for all forms:

```bash
rg -n --hidden \
  '(/mnt/|dbfs:/mnt/|/dbfs/mnt/|dbfs:/FileStore|/dbfs/FileStore)' \
  .
```

Choose the replacement by data type:

- Register tabular data as a Unity Catalog managed or external table and read it by table name.
- Put non-tabular governed files in a Unity Catalog volume and use `/Volumes/<catalog>/<schema>/<volume>/...`.
- Use an external location as the governance boundary for cloud paths and to create external tables or volumes.

Do not expose the same cloud prefix through both a DBFS mount and a Unity Catalog external location. Direct mount access bypasses Unity Catalog permissions, auditing, and path protections. Move every consumer first, then remove the mount through a separately reviewed change.

Checkpoint paths need their own plan. Do not relocate a running Structured Streaming checkpoint by copying arbitrary files. Either keep the existing durable path reachable under the supported compute model or perform a controlled checkpoint reset with source and sink reconciliation.

## Choose the Migration Mechanism Per Table

Databricks provides several paths. They create different target types and have different lifecycle consequences.

| Source and objective | Preferred mechanism | Important consequence |
| --- | --- | --- |
| Large workspace migration with identities, permissions, locations, and workloads | UCX assessment and workflows | Comprehensive, but Databricks Labs UCX has no formal support SLA |
| Existing external table, or managed Hive data outside workspace storage, kept in place | Upgrade wizard or `SYNC` | Creates a Unity Catalog external table and retains the source |
| Managed Delta table moved to Unity Catalog managed storage | `DEEP CLONE` | Copies data and metadata, but pre-migration table history is not migrated |
| Managed non-Delta or otherwise incompatible table moved to managed storage | CTAS | Copies query results; explicitly recreate required metadata and properties |

Databricks recommends UCX for most workspace upgrades. Use its assessment to identify identities, storage credentials, external locations, and code compatibility. UCX is a Databricks Labs project, so production plans still need internal ownership, testing, and rollback.

For an eligible external table, a representative sync is:

```sql
SYNC TABLE prod.sales.orders
FROM hive_metastore.sales.orders
SET OWNER `data-platform`;
```

`SYNC` copies registration metadata to a Unity Catalog external table. It leaves the Hive object intact and can be scheduled to pick up later source metadata changes during a hybrid period. It also writes bookkeeping properties to the source table. It is not the mechanism for a managed Hive table located in workspace storage.

For a managed Delta table, Databricks requires a deep clone across this metastore boundary:

```sql
CREATE OR REPLACE TABLE prod.sales.orders
DEEP CLONE hive_metastore.sales.orders;
```

The clone is a new table. Its data and relevant metadata are copied, but its earlier Delta history does not move with it. Preserve the old object for the agreed audit and rollback window.

When clone requirements are not met, use a managed-table CTAS and deliberately reproduce comments, constraints, properties, partitioning or clustering choices, and grants:

```sql
CREATE TABLE prod.sales.legacy_export
AS SELECT * FROM hive_metastore.sales.legacy_export;
```

Unity Catalog managed tables are the preferred default. Choose external tables when a real interoperability or externally managed lifecycle requirement justifies them.

## Rebuild Views Only After Their Inputs Move

Views are where partial migrations often fail. A Unity Catalog view must resolve its referenced objects in Unity Catalog. It cannot preserve a dependency on a workspace-local Hive table merely by qualifying that table as `hive_metastore`.

Move a view's referenced tables and views into the same Unity Catalog metastore first. Then recreate the view with three-level names:

```sql
CREATE OR REPLACE VIEW prod.reporting.daily_orders AS
SELECT
  date_trunc('DAY', created_at) AS order_day,
  count(*) AS order_count
FROM prod.sales.orders
GROUP BY 1;
```

Inventory nested views recursively. Migrating the outermost view first only moves the error to its first unresolved dependency. Review functions and path-based reads inside view SQL too.

Workspace Hive views remain workspace-scoped. They are not a durable compatibility layer for account-governed Unity Catalog objects. If consumers need a temporary stable name, use a Unity Catalog compatibility view after all its inputs have migrated.

## Migrate Identities and Grants Deliberately

Legacy workspace-local groups and Unity Catalog account groups are not interchangeable. Map users, groups, and service principals before table cutover. Prefer group ownership instead of personal ownership, and give production jobs a stable service principal.

Grant the hierarchy explicitly:

```sql
GRANT USE CATALOG ON CATALOG prod TO `sales-readers`;
GRANT USE SCHEMA ON SCHEMA prod.sales TO `sales-readers`;
GRANT SELECT ON TABLE prod.sales.orders TO `sales-readers`;

ALTER TABLE prod.sales.orders OWNER TO `data-platform`;
```

Do not blindly translate broad Hive grants into broad Unity Catalog grants. Use the migration to reduce excess access, but compare effective access before and after so intended consumers do not disappear. Include SQL warehouses, job run identities, BI service accounts, and deployment principals in tests.

For external targets, configure the storage credential and external location first. Grant data users access to tables or volumes, not direct privileges on storage credentials, unless they genuinely administer storage objects.

## Cut Over a Dependency Group

Use a repeatable sequence:

1. Freeze the source manifest and record source table versions or update timestamps.
2. Create target catalogs, schemas, managed storage, credentials, external locations, owners, and groups.
3. Migrate leaf tables with `SYNC`, `DEEP CLONE`, CTAS, or the selected UCX workflow.
4. Recreate functions and views only after all referenced objects are available.
5. Apply grants and run tests as the real job and user principals.
6. Reconcile schemas, row counts, key counts, null rates, checksums, and business aggregates.
7. Pause source writers, apply the final incremental sync or clone, and prove a version fence.
8. Switch writers before readers so there is only one authoritative write target.
9. Update code, jobs, dashboards, and default-catalog settings.
10. Revoke consumer access to old objects and run a full business cycle as a dependency test.
11. Drop old registrations only after the rollback and audit windows close.

For an external Hive table upgraded in place, old and new registrations may point to the same data. That does not make concurrent metadata or schema changes safe. Nominate one catalog entry as authoritative during the hybrid period and control writers accordingly.

## Validate More Than Row Counts

For every cutover compare:

- column names, types, nullability, comments, and generated expressions;
- constraints, table properties, format, partitioning, and clustering;
- current row count plus counts by stable business partition;
- minimum and maximum timestamps and duplicate business keys;
- view definitions and function resolution;
- effective privileges for each persona;
- batch, streaming, dbt, BI, and ad hoc access paths;
- reads from standard, dedicated, serverless, and SQL warehouse compute where applicable.

A green clone command proves only that the target was created. It does not prove that all writes were fenced, all consumers resolve the new namespace, or all principals can reach the storage through Unity Catalog.

## Official Documentation

- [Upgrade Hive tables and views to Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/migrate)
- [Use UCX to upgrade a workspace](https://docs.databricks.com/aws/en/data-governance/unity-catalog/ucx)
- [Work with the legacy Hive metastore alongside Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/hive-metastore)
- [Best practices for DBFS and Unity Catalog](https://docs.databricks.com/aws/en/dbfs/unity-catalog)
- [Databricks tables](https://docs.databricks.com/aws/en/tables/types)
- [Create views](https://docs.databricks.com/aws/en/views/create-views)
- [Manage privileges in Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/)
- [External locations](https://docs.databricks.com/aws/en/connect/unity-catalog/cloud-storage/external-locations)

## Conclusion

A safe Hive metastore migration starts with dependency and storage discovery, not a bulk rename. Find every hard-coded table and mount path, select the migration mechanism from the table's actual type and location, move view dependencies in order, and rebuild access with account identities. Cut over one authoritative writer, test real principals, and retain the old objects long enough to prove that no hidden consumer still depends on them.
