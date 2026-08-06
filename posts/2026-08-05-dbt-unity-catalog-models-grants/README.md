# Move dbt to Unity Catalog Without Losing Models or Grants

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, dbt, Unity Catalog, Data Migration, Grants, Analytics Engineering, Data Governance

Description: Migrate dbt relations to Unity Catalog while preserving names, incremental state, snapshots, and intended access.

---

A dbt project can compile successfully after switching its Databricks profile to Unity Catalog and still produce the wrong migration. Models may build into unexpected schemas, incremental tables may restart without their existing state, snapshots may lose history, and object grants may omit the catalog and schema privileges readers now require.

The core mapping is simple:

```text
dbt database  -> Databricks Unity Catalog catalog
dbt schema    -> Databricks Unity Catalog schema
dbt identifier -> relation name, such as a table or view
```

Preserving the logical dbt DAG is not the same as preserving its physical relations. Treat code, stored data, and permissions as three related migration tracks with a single cutover fence.

## Freeze the Current Relation Map

Before editing a profile, generate and archive dbt artifacts from the production revision:

```bash
dbt deps
dbt parse --target prod_hive
dbt ls --target prod_hive --output json > target/prod_hive_nodes.json
```

The manifest records each node's database, schema, alias, dependencies, resource configuration, and grants configuration. Use it to build a source-to-target relation map.

Inventory every dbt resource that can create or reference a database object:

- models, including ephemeral and incremental materializations;
- user-defined functions;
- sources and source freshness queries;
- seeds and snapshots;
- tests with hard-coded relation names;
- macros, pre-hooks, post-hooks, and `run-operation` macros;
- analyses, exposures, semantic models, saved queries, and documentation;
- package overrides and dispatch macros;
- variables that contain catalog, schema, or path names.

Search outside `models/` too:

```bash
rg -n --hidden \
  'hive_metastore|database[=:]|catalog[=:]|schema[=:]|/mnt/|dbfs:/' \
  .
```

Classify every relation as rebuildable, stateful, or externally owned:

| Class | Examples | Migration treatment |
| --- | --- | --- |
| Rebuildable | views, small table models | Rebuild in shadow catalog and compare |
| Stateful | incremental models, snapshots | Copy history or establish an explicit full-refresh epoch |
| Externally owned | sources, shared seed outputs, manual tables | Migrate outside dbt, then update dbt references |

Do not let the first Unity Catalog `dbt run` discover this classification in production.

## Configure the Three-Level Target Explicitly

Databricks recommends `dbt-databricks` version 1.8.0 or greater and OAuth for automated authentication. Pin a tested adapter and dbt version together rather than accepting an unreviewed upgrade during the metastore migration.

A profile target should explicitly name the Unity Catalog catalog and schema:

```yaml
analytics:
  target: prod_uc
  outputs:
    prod_uc:
      type: databricks
      host: "{{ env_var('DATABRICKS_HOST') }}"
      http_path: "{{ env_var('DATABRICKS_HTTP_PATH') }}"
      auth_type: oauth
      catalog: prod
      schema: analytics
      threads: 4
```

Do not put client secrets directly in `profiles.yml`. Use the supported environment or secret mechanism for the execution platform, and run production with a service principal whose Unity Catalog grants are intentional.

In dbt's cross-platform terminology, a `database` configuration maps to a catalog on Databricks. If a model has no database override, dbt uses the active target. Audit project-level and model-level overrides before assuming the profile controls every relation:

```yaml
models:
  analytics:
    finance:
      +database: prod
      +schema: finance
```

The default custom-schema behavior appends the custom schema to the target schema. A target schema of `dbt_prod` and `+schema: finance` becomes `dbt_prod_finance`, not `finance`. Preserve this behavior unless a reviewed `generate_schema_name` macro deliberately implements another convention.

Never remove the target schema from a custom naming macro for every environment. dbt warns that doing so makes developers and CI runs overwrite one another's objects.

## Preserve `ref()` and Fix Physical Names at the Boundaries

Models should refer to one another with `ref()`:

```sql
select
  order_id,
  customer_id,
  amount
from {{ ref('stg_orders') }}
```

When the target catalog changes, `ref()` compiles to the new physical relation while preserving the dependency graph. A hard-coded `hive_metastore.analytics.stg_orders` does neither.

Sources remain explicit boundaries and need their database/catalog updated:

```yaml
sources:
  - name: sales
    database: prod
    schema: raw
    tables:
      - name: orders
      - name: customers
```

Review calls to `source()`, any source-level quoting, and freshness configuration. Update only after the source table has been migrated and validated in Unity Catalog.

Inspect custom macros that construct relations with string concatenation. Prefer dbt's Relation APIs and `adapter.get_relation` so quoting and three-level names remain adapter-aware. Hooks containing raw `GRANT`, `OPTIMIZE`, `ANALYZE`, or path-based SQL need separate review.

Compile before executing:

```bash
dbt compile --target prod_uc
rg -n 'hive_metastore|/mnt/|dbfs:/' target/compiled target/manifest.json
```

The absence of `hive_metastore` is necessary but not sufficient. Compare the compiled relation set with the approved mapping and fail CI when a node targets an unexpected catalog or schema.

## Do Not Rebuild Stateful Relations Accidentally

Views and deterministic table models can usually be created in a shadow catalog from their sources. Incremental models and snapshots contain history that affects future results.

On a new target, `is_incremental()` is false because the target relation does not exist. The model's first run follows its full-build branch. That may be correct, but it is not a transparent continuation of the old table.

For each incremental model, choose one of these strategies:

### Full Rebuild

Run a full refresh into the Unity Catalog target from all authoritative source history. Use it when the complete input is retained and the cost and semantics are acceptable.

```bash
dbt build --target prod_uc --select +fct_orders --full-refresh
```

Do not assume `--full-refresh` is safe globally. Scope it to reviewed nodes and their required dependencies.

### Copy Existing State, Then Resume

Deep-clone or otherwise copy the existing Delta relation into its target name, validate it, and then let dbt continue incrementally. The exact table migration mechanism depends on whether the source is Hive or Unity Catalog, managed or external, and whether historical table versions must remain accessible.

Verify that the copied table matches the model's expected columns, constraints, partitioning or clustering, and unique key. Freeze source writers or capture an exact source version so no interval is lost between the copy and first dbt run.

### Establish a New Epoch

If historical continuity is intentionally abandoned, document the new lower bound and expose it to consumers. This is not preservation, but it can be a valid product decision when old history is unavailable.

Snapshots deserve stricter treatment. Their rows encode slowly changing history with dbt metadata columns. Starting a snapshot in an empty Unity Catalog table loses earlier versions and can make all currently visible records appear newly observed. Copy and validate the snapshot table before enabling the new snapshot job, or deliberately rebuild its history from an authoritative source.

## Separate Container Grants From Model Grants

Unity Catalog access is hierarchical. Selecting a table generally requires the object privilege plus `USE CATALOG` and `USE SCHEMA` on its parents. dbt's model `grants` resource configuration manages permissions on the table or view it builds. It does not replace catalog and schema provisioning.

Manage parent objects and ownership in infrastructure or a dedicated bootstrap step:

```sql
GRANT USE CATALOG ON CATALOG prod TO `analytics_readers`;
GRANT USE SCHEMA ON SCHEMA prod.analytics TO `analytics_readers`;

GRANT USE CATALOG ON CATALOG prod TO `dbt-prod`;
GRANT USE SCHEMA ON SCHEMA prod.analytics TO `dbt-prod`;
GRANT CREATE TABLE ON SCHEMA prod.analytics TO `dbt-prod`;
```

Use dbt grants for the objects dbt owns:

```yaml
models:
  analytics:
    +grants:
      select:
        - analytics_readers
```

dbt runs grant and revoke operations so the built relation's directly configured object grants match exactly. Inherited catalog and schema privileges remain outside the model config. This has three important consequences:

1. A more-specific `select` list replaces the less-specific list by default.
2. Prefixing a privilege as `+select` adds grantees to the inherited list instead of replacing it.
3. Removing a `grants` configuration tells dbt to stop managing those grants; an empty grantee list tells it to revoke them all.

For example:

```yaml
models:
  analytics:
    +grants:
      select: [analytics_readers]
    finance:
      +grants:
        +select: [finance_readers]
```

The inner `+select` retains the project reader and adds the finance reader. Without that prefix on the privilege, the finance-specific list would clobber the broader list.

Use hooks only for privileges or objects the resource config cannot express, such as advanced governance operations. Hooks execute as the dbt run principal and can drift if a model fails before or after them. Keep catalog and schema grants in idempotent infrastructure rather than repeating them after every model.

Prefer account groups and stable service principals to personal grants. Make a group the owner where operationally appropriate, and test effective access as representative reader and writer identities.

## Build Into a Shadow Catalog First

Create a non-production or shadow Unity Catalog target with the same object layout and privilege hierarchy:

```yaml
outputs:
  migration_shadow:
    type: databricks
    host: "{{ env_var('DATABRICKS_HOST') }}"
    http_path: "{{ env_var('DATABRICKS_HTTP_PATH') }}"
    auth_type: oauth
    catalog: migration_shadow
    schema: analytics
    threads: 4
```

Build the full approved graph for the initial shadow baseline:

```bash
dbt debug --target migration_shadow
dbt parse --target migration_shadow
dbt build --target migration_shadow
```

After that baseline exists, state selection can shorten later validation
iterations:

```bash
dbt build --target migration_shadow --select state:modified+ --state path/to/prod-artifacts
```

State-based selection compares dbt project artifacts, not database row state. It helps scope changed nodes but does not copy incremental data or snapshot history.

Compare the old and new environments at three levels:

### Graph and Naming

- same expected nodes, dependencies, materializations, and aliases;
- no compiled Hive names or DBFS mount paths;
- every relation in the approved catalog and schema;
- tests and hooks compile against the new namespace.

### Data

- row and distinct-key counts by stable partition;
- schema, nullability, and column order where clients depend on it;
- duplicate, freshness, and relationship tests;
- incremental watermark and maximum source coordinate;
- complete snapshot history and current-record flags;
- business aggregates over a representative interval.

### Access

- `SHOW GRANTS` for old and new relations;
- catalog and schema usage for each consumer group;
- build privileges for the dbt service principal;
- BI, job, and ad hoc reads using their real identities;
- row filters, masks, and dynamic view behavior where present.

## Cut Over Without Split-Brain Writes

Use a controlled sequence:

1. Pin the dbt project, package lock, adapter, and runtime versions.
2. Create catalogs, schemas, account groups, ownership, and parent grants.
3. Migrate source tables and verify all `source()` relations.
4. Copy stateful dbt relations or complete reviewed full rebuilds.
5. Build views and stateless models in the target namespace.
6. Apply model grants and compare effective access.
7. Pause the old production schedule and record its final source watermark.
8. Apply the final state delta, then run `dbt build` against Unity Catalog.
9. Reconcile the cutover interval and switch downstream consumers.
10. Keep the old environment read-only for the rollback window.

Do not run the Hive-target and Unity-Catalog-target incremental jobs concurrently against shared downstream effects. Only one target should be the production authority after the fence.

If rollback is required, stop the new writer before restarting the old one and account for source changes processed during the new epoch. A profile switch alone does not reverse data already committed.

## Official Documentation

- [Connect to dbt Core on Databricks](https://docs.databricks.com/aws/en/partners/prep/dbt)
- [dbt custom databases](https://docs.getdbt.com/docs/build/custom-databases)
- [dbt custom schemas](https://docs.getdbt.com/docs/build/custom-schemas)
- [dbt grants resource configuration](https://docs.getdbt.com/reference/resource-configs/grants)
- [Databricks configurations in dbt](https://docs.getdbt.com/reference/resource-configs/databricks-configs)
- [Unity Catalog securable objects](https://docs.databricks.com/aws/en/data-governance/unity-catalog/securable-objects)
- [Manage Unity Catalog privileges](https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/)
- [Upgrade Hive tables and views to Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/migrate)

## Conclusion

Preserving a dbt project through a Unity Catalog migration requires more than changing `catalog` in `profiles.yml`. Compile an exact relation map, keep internal edges behind `ref()`, update source boundaries, and migrate incremental and snapshot state deliberately. Provision catalog and schema access outside model builds, use dbt grants with full awareness of exact-match and inheritance behavior, and cut over at one proven source watermark.
