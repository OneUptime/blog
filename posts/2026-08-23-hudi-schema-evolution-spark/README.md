# Evolve Hudi Schemas Safely in Spark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Schema Evolution, Spark SQL, Data Lakehouse, Data Governance

Description: Safely add, drop, rename, and widen Hudi columns in Spark by separating compatible writes from experimental schema-on-read changes.

---

Apache Hudi supports backward-compatible schema evolution on write and experimental schema-on-read evolution for incompatible changes. The safest production plan is to use compatible changes wherever possible: append nullable columns and promote types without changing existing field order.

Drops, renames, and column moves require schema-on-read tracking in Hudi 1.2.x. Enabling it is a one-way table decision, so these changes need wider reader compatibility testing than a normal Spark `ALTER TABLE`.

## Classify the change before running SQL

Hudi's current schema-evolution matrix supports these changes for both Copy-on-Write and Merge-on-Read:

- Add a nullable root column at the end.
- Add a nullable nested field at the end.
- Add supported complex fields with defaults.
- Promote supported primitive, nested, and complex element types.

It does not support adding a non-nullable field to old data through normal write evolution. It also warns against adding a nullable field while reordering existing fields, because only some base files may be rewritten and readers can then interpret positions inconsistently.

The experimental schema-on-read feature covers deletion, renaming, movement, and more complex nested changes by tracking schema evolution and resolving it while reading.

Create a change record with:

- Current and proposed Spark schemas.
- COW or MOR table type.
- Hudi table and library version.
- All reader engines and their versions.
- Hive or Glue catalog schema.
- Rollback and backfill plan.

Schema compatibility is an end-to-end property, not just whether the Spark write succeeds.

## Add nullable columns

Spark SQL:

```sql
ALTER TABLE lake.orders ADD COLUMNS (
  fulfillment_note STRING COMMENT 'Optional fulfillment detail'
);
```

Old files have no physical value for the field, so readers resolve it as null. Keep the new field nullable until historical data has been backfilled and all producers send a value.

When older producers omit columns from incoming DataFrames, Hudi 1.2 can fill nullable table fields with null when:

```text
hoodie.write.set.null.for.missing.columns=true
```

Use this as a controlled compatibility bridge, not a substitute for upgrading producers. Monitor null rate by producer version.

Avoid inserting the new top-level field at `FIRST` or `AFTER` under ordinary write-time evolution. The official matrix specifically warns that field reordering can make reads fail when only part of the table is rewritten.

## Widen types with the documented matrix

A common safe promotion is `INT` to `BIGINT`:

```sql
ALTER TABLE lake.orders
ALTER COLUMN item_count TYPE BIGINT;
```

Hudi 1.2 documents a detailed source-to-target promotion matrix. Numeric widening such as int to long, float, or double is supported; narrowing such as long to int is not. String, bytes, decimal, and date conversions have specific rules and should not be inferred from Spark's general cast behavior.

Before widening:

1. Validate every producer emits a compatible type.
2. Test old and new file slices in one snapshot read.
3. Test incremental reads spanning the schema change.
4. Sync the new schema to the catalog.
5. Verify non-Spark readers.

An explicit `cast` in a DataFrame does not make an unsupported table evolution safe.

## Enable schema on read only for incompatible changes

For drop, rename, or movement:

```text
hoodie.schema.on.read.enable=true
```

The Hudi documentation labels this feature experimental and states that it cannot be disabled after the table has accepted such changes. Spark also needs the Hudi catalog configuration, including:

```text
spark.sql.catalog.spark_catalog=org.apache.spark.sql.hudi.catalog.HoodieCatalog
spark.sql.extensions=org.apache.spark.sql.hudi.HoodieSparkSessionExtension
```

Test every reader. An engine that reads Parquet files or catalog schema without Hudi's schema reconciliation may not understand renamed or dropped columns correctly.

For broad heterogeneous access, a safer rename is often additive:

1. Add `new_name` as nullable.
2. Dual-write or backfill it from `old_name`.
3. Move readers to `new_name`.
4. Stop writing `old_name`.
5. Drop it only when all readers support the final evolution.

This costs time and storage but gives a reversible migration.

## Drop and rename with Spark SQL

After schema-on-read prerequisites and reader tests:

```sql
ALTER TABLE lake.orders DROP COLUMN legacy_code;

ALTER TABLE lake.orders
RENAME COLUMN customer_ref TO customer_id;
```

Nested paths are supported by the documented syntax. Do not rename record-key, ordering, or partition fields as if they were ordinary columns. Those fields participate in identity, merge, or physical layout contracts. A new table and controlled migration is usually safer for such changes.

A drop changes the logical schema; it is not proof that old bytes have been physically erased from retained file versions. Cleaning, savepoints, backups, and replicas determine physical retention.

## Coordinate the metastore

Hive Metastore can reject position or type changes with:

```text
The following columns have types incompatible with the existing columns
in their respective positions
```

The Hudi 1.2 schema guide explains that `hive.metastore.disallow.incompatible.col.type.changes=false` disables this Hive check. For an embedded metastore, pass it with Spark's `spark.hadoop.` prefix. For a remote metastore, configure the server or use a supported HiveServer2 metaconf session.

Disabling the catalog check does not make the Hudi or Parquet change compatible. Use it only after the table evolution is valid and the mismatch is a metastore position check.

## Validate and roll out

Create a savepoint or backup, then test on a representative table clone:

- Describe the table through Spark and every catalog-backed engine.
- Snapshot-read untouched old files and newly written files together.
- Incrementally read across the evolution instant.
- Upsert, delete, compact, cluster, and clean.
- Verify record key, partition path, and ordering fields are unchanged.
- Compare counts, null rates, and key checksums.

Roll writers first only when old readers can read the evolved schema. Otherwise upgrade readers before publishing the schema change. Keep catalog sync in the same deployment plan so the physical Hudi schema and registered schema do not drift.

## Official Documentation

- [Apache Hudi schema evolution](https://hudi.apache.org/docs/schema_evolution/)
- [Apache Hudi Spark SQL DDL](https://hudi.apache.org/docs/sql_ddl/)
- [Apache Hudi Spark SQL DML](https://hudi.apache.org/docs/sql_dml/)
- [Apache Spark SQL ALTER TABLE](https://spark.apache.org/docs/latest/sql-ref-syntax-ddl-alter-table.html)

## Conclusion

Prefer nullable additions and documented type promotions. Treat drop and rename as experimental schema-on-read migrations with irreversible table configuration and full reader testing. Never confuse a successful Spark command with end-to-end compatibility across old files, catalogs, and downstream engines.
