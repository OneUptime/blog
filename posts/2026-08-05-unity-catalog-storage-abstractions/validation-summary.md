# Validation Summary: Choose Unity Catalog Storage: Tables, Volumes, or Locations

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Databricks
- Unity Catalog
- Managed and external tables
- Managed and external volumes
- External locations and storage credentials
- Delta Lake and Apache Iceberg
- Apache Spark and PySpark
- Databricks SQL
- Databricks CLI
- Amazon S3 and AWS IAM
- Structured Streaming checkpoints

## Sources Consulted

- [Databricks Unity Catalog table types](https://docs.databricks.com/aws/en/tables/types)
- [Unity Catalog managed tables for Delta Lake and Apache Iceberg](https://docs.databricks.com/aws/en/tables/managed)
- [Work with files in Unity Catalog volumes](https://docs.databricks.com/aws/en/volumes/volume-files)
- [Create and manage Unity Catalog volumes](https://docs.databricks.com/aws/en/volumes/utility-commands)
- [Path rules and access in Unity Catalog volumes](https://docs.databricks.com/aws/en/volumes/paths)
- [Privileges for Unity Catalog volumes](https://docs.databricks.com/aws/en/volumes/privileges)
- [Connect to an AWS S3 external location](https://docs.databricks.com/aws/en/connect/unity-catalog/cloud-storage/s3/)
- [Manage external locations](https://docs.databricks.com/aws/en/connect/unity-catalog/cloud-storage/manage-external-locations)
- [Resolve storage path conflicts](https://docs.databricks.com/aws/en/data-governance/unity-catalog/storage-conflicts)
- [Unity Catalog securable objects reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/securable-objects)
- [Unity Catalog privileges reference](https://docs.databricks.com/aws/en/data-governance/unity-catalog/access-control/privileges-reference)
- [Structured Streaming checkpoints](https://docs.databricks.com/aws/en/structured-streaming/checkpoints)

## Issues Found

- The default decision flow could imply that all direct cloud-URI access is authorized with external-location file privileges. Clarified that `READ FILES` and `WRITE FILES` apply to eligible files that are not registered as a table or volume; cloud-URI access beneath registered external tables and external volumes is governed by privileges on those objects.
- The privilege guidance did not state the read-privilege prerequisites for writes. Clarified that volume file writes require both `READ VOLUME` and `WRITE VOLUME`, and that `WRITE FILES` requires `READ FILES` on the same external location.

## Review Notes

- The SQL and PySpark examples are syntactically valid and align with current Databricks guidance. They assume the referenced catalogs and schemas already exist and that the execution principal has the required parent-object and creation privileges.
- Managed-table deletion is lifecycle-managed rather than necessarily immediate. Current Unity Catalog documentation states that dropped managed tables are recoverable for seven days by default before the underlying data is permanently deleted; the post's wording remains accurate because it refers to the managed object lifecycle.
- Apache Iceberg support for Unity Catalog managed tables is current, but Iceberg tables must be created explicitly with `USING iceberg`; omitting a format creates a Delta table by default.
