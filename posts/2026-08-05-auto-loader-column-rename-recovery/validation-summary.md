# Validation Summary: Recover Auto Loader After a Source Column Rename Without Reingestion

## Status
validated

## Post Type
Technical recovery guide

## Technologies Covered
- Databricks Auto Loader
- Apache Spark Structured Streaming and PySpark
- Delta Lake schema evolution and `MERGE`
- Databricks SQL
- Unity Catalog volumes
- Rescued data and the Databricks `VARIANT` type

## Sources Consulted
- [Configure schema inference and evolution in Auto Loader](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/schema)
- [Schema evolution in Databricks](https://docs.databricks.com/aws/en/data-engineering/schema-evolution)
- [What is Auto Loader?](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/)
- [Configure Auto Loader for production workloads](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/production)
- [Auto Loader best practices](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/best-practices)
- [Using Auto Loader with Unity Catalog](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/unity-catalog)
- [`cloud_files_state` table-valued function](https://docs.databricks.com/aws/en/sql/language-manual/functions/cloud_files_state)
- [File metadata column](https://docs.databricks.com/aws/en/ingestion/file-metadata-column)
- [Configure Structured Streaming trigger intervals](https://docs.databricks.com/aws/en/structured-streaming/triggers)
- [Update table schemas with schema evolution](https://docs.databricks.com/aws/en/tables/update-schema)
- [Upsert into a Delta Lake table using `MERGE`](https://docs.databricks.com/aws/en/delta/merge)
- [Rename and drop columns with Delta Lake column mapping](https://docs.databricks.com/aws/en/tables/features/column-mapping)
- [`from_json` function](https://docs.databricks.com/aws/en/sql/language-manual/functions/from_json)
- [`get_json_object` function](https://docs.databricks.com/aws/en/sql/language-manual/functions/get_json_object)
- [`try_cast` function](https://docs.databricks.com/aws/en/sql/language-manual/functions/try_cast)
- [`parse_json` function](https://docs.databricks.com/aws/en/sql/language-manual/functions/parse_json)
- [`try_variant_get` function](https://docs.databricks.com/aws/en/sql/language-manual/functions/try_variant_get)
- [`count_if` aggregate function](https://docs.databricks.com/aws/en/sql/language-manual/functions/count_if)
- [PySpark `DataStreamWriter.trigger`](https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.DataStreamWriter.trigger.html)

## Issues Found
- The `cloud_files_state` example selected `discovery_time`, `commit_time`, and `ingestion_state` while referring only to a generic "supported runtime." Those columns require Databricks Runtime 16.4 or later, and `commit_time` and `ingestion_state` have additional population conditions based on the processing runtime and `cloudFiles.cleanSource`. The runtime requirement and population caveat were added.
- The post inspected `_rescued_data` for `account_id` but the Silver backfill and dual-write validation examples used only top-level fields, so rows from a rescued interval could still produce a null canonical value or escape the disagreement check. The examples now recover both `account_id` and `source_schema_version` from `_rescued_data` when necessary.
- The `MERGE` guidance described the operation as idempotent while requiring only a stable event key. Delta `MERGE` can fail when multiple source rows match one target row, so the guidance now requires a stable, unique event key and states the multiple-match constraint.

## Review Notes
- Auto Loader's handling of a source rename as an added column plus a soft-deleted old column is accurately described by current Databricks schema-evolution documentation.
- The `addNewColumns`, `rescue`, and explicit-schema behavior is current: `addNewColumns` updates schema state and stops with `UnknownFieldException`; `rescue` keeps new fields in rescued data; and an explicit schema defaults to `none` and cannot use `addNewColumns`.
- The checkpoint, RocksDB file-state, exactly-once Delta sink, lifecycle-policy, Unity Catalog storage, `mergeSchema`, `AvailableNow`, hidden file metadata, and Delta column-mapping claims are consistent with current official documentation.
- `parse_json` and `try_variant_get` require Databricks Runtime 15.3 or later. The post correctly notes that function availability is runtime-dependent and provides `from_json` as the more portable alternative.
