# Validation Summary: Move dbt to Unity Catalog Without Losing Models or Grants

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- dbt Core
- dbt-databricks
- Databricks
- Unity Catalog
- Delta Lake
- dbt incremental models and snapshots
- dbt artifacts, state selection, and resource grants
- OAuth and service-principal authentication

## Sources Consulted
- [Connect to dbt Core](https://docs.databricks.com/aws/en/partners/prep/dbt)
- [Custom databases](https://docs.getdbt.com/docs/build/custom-databases)
- [Custom schemas](https://docs.getdbt.com/docs/build/custom-schemas)
- [Manifest JSON file](https://docs.getdbt.com/reference/artifacts/manifest-json)
- [`dbt parse`](https://docs.getdbt.com/reference/commands/parse)
- [`dbt ls`](https://docs.getdbt.com/reference/commands/list)
- [`dbt compile`](https://docs.getdbt.com/reference/commands/compile)
- [`dbt build`](https://docs.getdbt.com/reference/commands/build)
- [`ref()`](https://docs.getdbt.com/reference/dbt-jinja-functions/ref)
- [`source()`](https://docs.getdbt.com/reference/dbt-jinja-functions/source)
- [dbt Relation class](https://docs.getdbt.com/reference/dbt-classes#relation)
- [Configure incremental models](https://docs.getdbt.com/docs/build/incremental-models)
- [Add snapshots to your DAG](https://docs.getdbt.com/docs/build/snapshots)
- [Node selector methods and state selection](https://docs.getdbt.com/reference/node-selection/methods#state)
- [Grants resource configuration](https://docs.getdbt.com/reference/resource-configs/grants)
- [dbt grant-statement implementation](https://github.com/dbt-labs/dbt-adapters/blob/860da89225e2ecf1bf47038f5ac40d4eaa4019a2/dbt-adapters/src/dbt/include/global_project/macros/adapters/apply_grants.sql)
- [Databricks configurations](https://docs.getdbt.com/reference/resource-configs/databricks-configs)
- [Unity Catalog securable objects reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/securable-objects)
- [Unity Catalog privileges reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/privileges-reference)
- [Manage privileges in Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/)
- [`GRANT`](https://docs.databricks.com/aws/en/sql/language-manual/security-grant)
- [`SHOW GRANTS`](https://docs.databricks.com/aws/en/sql/language-manual/security-show-grant)
- [Upgrade Hive tables and views to Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/migrate)

## Issues Found
- The three-level mapping described a dbt identifier only as a table or view name. Current dbt-databricks also supports other relation materializations, including materialized views and streaming tables, so the mapping now uses the accurate generic term "relation name."
- The resource inventory used the nonstandard phrase "saved documentation" and omitted analyses, saved queries, and current dbt user-defined functions. The list now names those resource types explicitly so the claimed comprehensive namespace audit is complete.
- The post searched `target/run` immediately after `dbt compile`. The compile command writes compiled SQL under `target/compiled` and does not generate or refresh run SQL under `target/run`, so that path could be absent or stale. It was removed from the compile audit command.
- The dbt grant examples used hyphenated group names such as `analytics-readers`. Databricks requires principals containing special characters to be enclosed in backticks, while dbt's grant-statement macro interpolates configured grantee strings directly. The examples now use identifier-safe names (`analytics_readers` and `finance_readers`) so the generated grant SQL is valid without embedding quoting characters in grant configuration.
- The exact-match statement could be read as applying to all effective Unity Catalog permissions. It now explicitly applies to the directly configured object grants that dbt manages; inherited catalog and schema privileges remain outside the model-level grant configuration.

## Review Notes
Databricks still publishes `dbt-databricks` 1.8.0 or greater as its minimum recommendation and recommends OAuth for automated authentication. The post appropriately advises pinning a tested adapter and dbt combination rather than treating that minimum as a current version pin. The remaining profile fields, CLI flags, selector syntax, custom schema/database behavior, `is_incremental()` explanation, snapshot continuity guidance, Delta deep-clone qualification, Unity Catalog privilege hierarchy, SQL grant syntax, and state-selection caveat match the official documentation as of 2026-08-06.
