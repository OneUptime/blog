# Fix Hudi Hive Sync Schema Differences on Partitioned Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Hive Sync, Schema Evolution, Partitioning, Spark

Description: Resolve Hudi Hive sync schema-difference errors by aligning data schema, partition fields, extractors, types, and metastore state.

---

Hudi Hive sync compares the table schema and partition contract stored by Hudi with the table registered in Hive Metastore. A `Schema Difference Found` failure means those contracts no longer match. On partitioned tables, the most common causes are duplicated or reordered partition columns, a partition extractor that returns the wrong number of values, and a type evolution that Hive rejects by position.

Do not solve the error by dropping the catalog table immediately. First identify whether the Hudi table, sync configuration, or metastore entry is wrong.

This guide targets Apache Hudi 1.2.x.

## Capture all three views

Collect:

1. The Hudi table schema from a snapshot read.
2. The Hudi table properties in `.hoodie/hoodie.properties`.
3. The Hive catalog schema and partition list.

In Spark:

```python
spark.read.format("hudi").load(table_path).printSchema()
spark.sql("DESCRIBE EXTENDED lake.orders").show(200, truncate=False)
spark.sql("SHOW PARTITIONS lake.orders").show(200, truncate=False)
```

Record the writer's sync options and the full exception. Check whether the difference is in ordinary columns, Hudi metadata columns, partition columns, type, order, or nullability.

Do not compare only the latest producer DataFrame with Hive. Hudi's resolved table schema is the source for meta sync.

## Align write and sync partition fields

These options serve different components but must describe the same logical layout:

```text
hoodie.datasource.write.partitionpath.field=event_date,region
hoodie.datasource.hive_sync.partition_fields=event_date,region
```

The order matters. Physical paths and extractor output must correspond to the Hive partition column order. If one job syncs `region,event_date` while writers generate `event_date,region`, schema comparison and partition registration can fail or produce incorrectly labeled values.

Also keep `hoodie.datasource.write.drop.partition.columns` consistent. By default Hudi persists partition columns in data files. A catalog table commonly lists partition columns separately after ordinary columns. Changing drop behavior on an existing table requires careful reader and sync testing.

## Choose the correct partition extractor

Hudi uses a `PartitionValueExtractor` to turn a physical partition path into catalog values. Current documentation describes these common cases:

- `MultiPartKeysValueExtractor` splits multi-level paths on `/` and is the general default.
- `SinglePartPartitionValueExtractor` treats a date path such as `yyyy/MM/dd` as one logical value.
- `HiveStylePartitionValueExtractor` handles `key=value` paths and is inferred for hive-style partitioning.
- `NonPartitionedExtractor` is inferred for non-partitioned tables.

For an explicit multi-level layout:

```python
sync_options = {
    "hoodie.datasource.hive_sync.enable": "true",
    "hoodie.datasource.hive_sync.mode": "hms",
    "hoodie.datasource.hive_sync.database": "lake",
    "hoodie.datasource.hive_sync.table": "orders",
    "hoodie.datasource.hive_sync.partition_fields": "event_date,region",
    "hoodie.datasource.hive_sync.partition_extractor_class":
        "org.apache.hudi.hive.MultiPartKeysValueExtractor",
}
```

Do not copy an extractor from an old Hudi example without checking the physical paths. Hudi changed the general default to `MultiPartKeysValueExtractor` in 0.12, and common layouts are now inferred.

## Resolve type and field-order changes

Hudi supports compatible schema evolution such as appending nullable columns and promoting supported types. Hive Metastore can still reject changes based on position with an incompatibility message.

For an embedded metastore in the Spark process, the Hudi schema guide documents:

```text
--conf spark.hadoop.hive.metastore.disallow.incompatible.col.type.changes=false
```

For a remote metastore, the setting must take effect on the metastore service, either in its `hive-site.xml` or through a supported HiveServer2 `metaconf:` override. Setting an ordinary Spark SQL session property does not change a remote server.

Disable this check only after confirming the Hudi evolution is supported. It bypasses a Hive guard; it does not rewrite incompatible Parquet data or make a column narrowing safe.

Timestamp interpretation can also differ. Review `hoodie.datasource.hive_sync.support_timestamp` and keep it stable across writers and sync jobs. Test timestamp columns in the actual Hive-compatible engine after changing it.

## Use one sync owner and one mode

Hudi supports `hms`, `jdbc`, and `hiveql` sync modes. Prefer one documented mode for a table and keep the Hudi bundle consistent. The HMS mode talks directly to the metastore and avoids some HiveServer2 dependencies.

Multiple writers with different sync settings can alternate the registered schema on every commit. Centralize:

- Database and table name.
- Partition fields and extractor.
- Hive-style partitioning and URL decoding.
- Timestamp support.
- Metadata-field inclusion.
- Hudi library version.

If meta sync is run separately, ensure it uses the same table base path and release as the writer.

## Repair a stale catalog entry

First attempt a one-shot sync with corrected options. Hudi's Spark SQL procedure can sync the latest schema:

```sql
CALL hive_sync(
  table => 'orders',
  mode => 'hms',
  partition_fields => 'event_date,region',
  partition_extractor_class =>
    'org.apache.hudi.hive.MultiPartKeysValueExtractor'
);
```

Hudi 1.2 also documents `hoodie.datasource.hive_sync.recreate_table_on_error=true`. This can drop and recreate a mismatched Hive table to match Hudi. Use it only after exporting the catalog DDL and properties, checking grants and views, stopping competing sync jobs, and confirming that the catalog entry is disposable.

Recreation changes catalog metadata, not Hudi data files. It can still remove custom table properties, permissions, or downstream assumptions, so it should be a controlled recovery option rather than the first troubleshooting step.

Do not use `MSCK REPAIR TABLE` as a generic Hudi schema repair. Hudi meta sync understands Hudi's timeline and partition changes; external repair commands do not resolve the table schema contract.

## Verify the fix

After successful sync:

1. Compare `DESCRIBE` output with the Hudi snapshot schema.
2. Confirm partition columns appear once and in the correct order.
3. Run `SHOW PARTITIONS` and inspect several physical paths.
4. Query filters on each partition field.
5. Query timestamps and newly evolved columns.
6. Run another no-schema-change commit and ensure sync remains stable.

If the next commit fails again, another writer is probably publishing different options or schemas. Search job configurations rather than repeatedly recreating the metastore table.

## Official Documentation

- [Apache Hudi Hive Metastore sync](https://hudi.apache.org/docs/syncing_metastore/)
- [Apache Hudi schema evolution](https://hudi.apache.org/docs/schema_evolution/)
- [Apache Hudi configurations](https://hudi.apache.org/docs/configurations/)
- [Apache Hudi SQL procedures](https://hudi.apache.org/docs/procedures/)

## Conclusion

Fix schema-difference errors by reconciling Hudi schema, physical partition paths, extractor output, and Hive's registered column order. Keep all writers on one sync contract, relax Hive type checks only for valid Hudi evolution, and reserve catalog recreation for a reviewed recovery.
