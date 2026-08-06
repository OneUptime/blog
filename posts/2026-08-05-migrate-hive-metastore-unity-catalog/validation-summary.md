# Validation Summary: Migrate Hive Metastore Tables to Unity Catalog Safely

## Status
validated

## Post Type
Technical migration guide and operational runbook

## Technologies Covered

- Databricks
- Unity Catalog
- Workspace-local Hive metastore
- Delta Lake
- DBFS root and DBFS mounts
- Unity Catalog volumes, storage credentials, and external locations
- Databricks Labs UCX
- Spark SQL and Structured Streaming
- Databricks Asset Bundles, Lakeflow pipelines, and dbt
- ripgrep and YAML

## Sources Consulted

- [Upgrade Hive tables and views to Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/migrate)
- [SYNC SQL command](https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-aux-sync)
- [Clone a table on Databricks](https://docs.databricks.com/aws/en/tables/operations/clone)
- [Use the UCX utilities to upgrade your workspace to Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/ucx)
- [Work with the legacy Hive metastore alongside Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/hive-metastore)
- [Create and manage views](https://docs.databricks.com/aws/en/views/create-views)
- [Query data and identifier resolution](https://docs.databricks.com/aws/en/query)
- [Review table details with DESCRIBE DETAIL](https://docs.databricks.com/aws/en/tables/operations/table-details)
- [Hive metastore privileges and securable objects](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/table-acls/object-privileges)
- [Manage privileges in Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/manage-privileges/)
- [Manage workspace-local groups](https://docs.databricks.com/aws/en/admin/users-groups/workspace-local-groups)
- [What is DBFS?](https://docs.databricks.com/aws/en/dbfs/)
- [Best practices for DBFS and Unity Catalog](https://docs.databricks.com/aws/en/dbfs/unity-catalog)
- [What are Unity Catalog volumes?](https://docs.databricks.com/aws/en/volumes/)
- [Work with external tables](https://docs.databricks.com/aws/en/tables/external)
- [Manage external locations](https://docs.databricks.com/aws/en/connect/unity-catalog/cloud-storage/manage-external-locations)
- [Structured Streaming checkpoints](https://docs.databricks.com/aws/en/structured-streaming/checkpoints)

## Issues Found

- The inventory section presented `DESCRIBE DETAIL` as a general metadata command. The command is documented for Delta Lake and Apache Iceberg tables, so the text now states that format restriction.
- The inventory section did not identify the legacy table-access-control context for Hive `SHOW GRANTS`. The text now explains that Hive grants are relevant where legacy table access control is enabled.
- The post stated that Unity Catalog does not permit a view to cross the boundary to the workspace-local Hive metastore. Current Databricks documentation allows such a reference, but the resulting view can be accessed only from the workspace containing the Hive table. The opening and view-migration section now describe that workspace dependency accurately while retaining the recommendation to migrate all inputs first.

## Review Notes

- The `SYNC TABLE ... FROM ... SET OWNER` example matches the documented syntax. `SYNC` creates or updates a Unity Catalog external table, supports external Hive tables and managed Hive tables outside workspace storage, and writes bookkeeping properties to the source unless source writes are disabled by configuration.
- The cross-metastore `CREATE OR REPLACE TABLE ... DEEP CLONE` example matches Databricks migration guidance for managed Delta tables. Deep clone copies data and supported metadata, supports incremental refreshes of an existing clone, and does not migrate the source table's prior Delta history.
- The CTAS, Unity Catalog grants, ownership-transfer, ripgrep, YAML, view, and volume-path examples are syntactically valid as shown.
- DBFS root and DBFS mounts are currently deprecated. The recommendations to use Unity Catalog tables for tabular data, volumes for non-tabular files, and external locations as cloud-storage governance boundaries align with current documentation.
- Databricks recommends UCX for most workspace upgrade scenarios, but UCX remains a Databricks Labs project without formal Databricks support SLAs.
- No product versions are pinned in the post. Migration eligibility and compute requirements should still be rechecked against the current Databricks Runtime and cloud-specific documentation when executing a production migration.
