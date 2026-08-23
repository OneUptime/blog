# Stop Duplicate Hudi Records Across Files and Partitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Data Quality, Deduplication, Spark, Indexing

Description: Diagnose and prevent duplicate Hudi records by aligning write operations, key scope, partition paths, indexes, and concurrency.

---

Hudi can enforce key-based upsert semantics, but it cannot repair an ambiguous identity model automatically. Duplicate rows normally come from one of four places: duplicate input accepted by an insert path, inconsistent record keys, the same key written to different partitions under a non-global index, or overlapping concurrent inserts.

The fastest fix is to identify which boundary failed rather than attempting a full-table `dropDuplicates` after every write.

This guide uses Apache Hudi 1.2.x terminology. It distinguishes duplicate business keys from multiple physical file versions, because Hudi legitimately keeps old file slices until the cleaner removes them.

## First prove that the snapshot is duplicated

Do not count raw Parquet files in the table path. Hudi uses multiversion storage, so old base-file versions can coexist with current files. Always query through a Hudi-aware snapshot reader:

```python
snapshot = spark.read.format("hudi").load(table_path)

duplicates = (
    snapshot.groupBy("tenant_id", "order_id")
    .count()
    .where("count > 1")
)
duplicates.show(truncate=False)
```

Add the Hudi metadata columns to see the scope:

```sql
SELECT
  tenant_id,
  order_id,
  _hoodie_record_key,
  _hoodie_partition_path,
  _hoodie_file_name,
  _hoodie_commit_time
FROM orders
WHERE (tenant_id, order_id) IN (
  SELECT tenant_id, order_id
  FROM orders
  GROUP BY tenant_id, order_id
  HAVING count(*) > 1
)
ORDER BY tenant_id, order_id, _hoodie_partition_path;
```

Different `_hoodie_record_key` values point to key-generation drift. The same record key in different partition paths points to partition-scoped uniqueness. The same key and partition in several current files usually points to insert semantics or concurrent inserts.

## Use upsert when a key may already exist

The `upsert` operation performs index lookup and combines versions of the same key. By contrast, `insert` and `bulk_insert` optimize for new data. The Hudi FAQ states that insert and bulk insert do not pre-combine duplicate input by default, so duplicate keys in the source can become duplicate rows.

For mutable or retryable input, make the intent explicit:

```python
options = {
    "hoodie.table.name": "orders",
    "hoodie.datasource.write.operation": "upsert",
    "hoodie.datasource.write.recordkey.field": "tenant_id,order_id",
    "hoodie.datasource.write.keygenerator.type": "COMPLEX",
    "hoodie.datasource.write.partitionpath.field": "event_date",
    "hoodie.table.ordering.fields": "source_lsn",
}

incoming.write.format("hudi").options(**options).mode("append").save(table_path)
```

If the feed is genuinely insert-only, pre-deduplicate it deliberately. `hoodie.combine.before.insert=true` combines matching keys in the incoming batch. Spark SQL insert also supports `hoodie.datasource.insert.dup.policy` with `none`, `drop`, or `fail` for records already present in storage. Prefer `fail` during rollout because it exposes broken assumptions instead of hiding them.

The older `hoodie.datasource.write.insert.drop.duplicates` option remains documented but is deprecated in favor of the newer Spark SQL duplicate policy. Check which write API your job uses before copying a setting.

## Keep key generation identical in every writer

A small representation change creates a different Hudi key. Examples include:

- `42` versus `0042` after inconsistent string normalization.
- A null component replaced with an empty string in only one pipeline.
- Field order changed from `tenant_id,order_id` to `order_id,tenant_id`.
- One job using a simple generator while another uses a composite generator.

Centralize the key configuration and test the resulting `_hoodie_record_key`. Do not assume equivalent-looking source columns produce the same materialized key.

Keys must also be stable across schema evolution. If an old producer and a new producer derive identity differently, deploy a migration into a new table rather than mixing key contracts in place.

## Match index scope to partition behavior

Spark's non-global indexes enforce uniqueness for `record key + partition path`. They are efficient when every update supplies the same partition path as the original row. They do not search all other partitions, so a key written first to `event_date=2026-08-22` and later to `event_date=2026-08-23` can exist twice.

There are two sound designs:

1. Keep the partition path immutable for each key. Carry the original partition field in every CDC event, even when the business event time changes.
2. Use a global index when the record key must be unique table-wide or records legitimately move between partitions.

Current Hudi supports `GLOBAL_BLOOM`, `GLOBAL_SIMPLE`, and a global Record-Level Index. The Record-Level Index stores key-to-location mappings in the metadata table and is designed to scale global lookup without scanning the entire data table. Global index options have different partition-move controls, so validate movement explicitly before deployment.

Do not change index type and declare existing duplicates fixed. An index controls future location lookup; it does not merge rows already stored under conflicting identities. Clean historical duplicates through a controlled rewrite or a keyed correction job first.

## Account for concurrent writers

Hudi's concurrency documentation makes an important distinction: with optimistic concurrency control, upserts retain uniqueness guarantees, but concurrent `insert` or `bulk_insert` writers can still create duplicates because each can create new file groups that the other writer did not inspect.

If multiple processes write the table:

- Configure `hoodie.write.concurrency.mode=optimistic_concurrency_control`.
- Use the same external lock provider in every writer.
- Set `hoodie.cleaner.policy.failed.writes=LAZY` as required for multi-writer OCC.
- Prefer upsert for keys that could overlap.
- Partition or route workloads so writers touch disjoint keys and file groups where possible.

An in-process lock only coordinates work inside one process. It does not protect two Spark applications.

## Repair existing duplicates safely

Create a deterministic winner with the same ordering rule the table should use:

```python
from pyspark.sql import Window
from pyspark.sql.functions import col, row_number

w = Window.partitionBy("tenant_id", "order_id").orderBy(
    col("source_lsn").desc(),
    col("_hoodie_commit_time").desc(),
)

repaired = (
    snapshot.withColumn("_winner", row_number().over(w))
    .where("_winner = 1")
    .drop("_winner")
)
```

For widespread duplicates or a changed key contract, write `repaired` into a new Hudi table, validate counts and aggregates, then switch consumers. For a limited set, issue deletes for obsolete keys and partitions followed by upserts of winners. Keep a backup or savepoint before a destructive correction.

After repair, rerun three checks: duplicate business keys, keys spanning multiple partitions, and retry idempotency. Also verify there are no inflight or failed commits being mistaken for current data.

## Official Documentation

- [Apache Hudi writing tables FAQ](https://hudi.apache.org/faq/writing_tables/)
- [Apache Hudi write operations](https://hudi.apache.org/docs/write_operations/)
- [Apache Hudi indexes](https://hudi.apache.org/docs/indexes/)
- [Apache Hudi concurrency control](https://hudi.apache.org/docs/concurrency_control/)
- [Apache Hudi key generation](https://hudi.apache.org/docs/key_generation/)

## Conclusion

Preventing duplicates requires a stable key, the correct write operation, a partition contract that matches index scope, and coordinated writers. Query the Hudi snapshot first, use metadata columns to classify the failure, repair historical rows deterministically, and then enforce the corrected contract on every producer.
