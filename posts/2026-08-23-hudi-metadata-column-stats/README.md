# Enable Hudi Metadata and Column-Stats Indexes Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Metadata Table, Column Statistics, Data Skipping, Performance

Description: Roll out Hudi metadata and column-statistics indexes with bounded columns, measured writer cost, and verified data skipping.

---

Hudi's metadata table stores file listings and optional indexes in an internal Merge-on-Read table under the data table. File-listing metadata avoids slow recursive object-store listings. Column statistics store per-file minimum, maximum, null count, and related values so readers can skip files that cannot match a predicate.

Both features improve planning, but writers must update their metadata on every relevant commit. Enabling statistics for every column on a wide, high-rate table can add avoidable serialization, storage, and metadata-table compaction work.

This guide targets Apache Hudi 1.2.x.

For a broader view of table types, indexing, compaction, and shared write settings, start with the [Apache Hudi table configuration guide](../2026-01-24-apache-hudi-tables-configuration/README.md). This guide focuses specifically on operating metadata and column-stats indexes.

## Enable the file-listing metadata first

The write-side metadata table is enabled by default in current Hudi:

```text
hoodie.metadata.enable=true
```

Make it explicit in shared configuration and verify the `files` metadata partition is healthy before adding indexes. File listing usually provides the broadest benefit on S3, GCS, or Azure because listing a large table can take seconds or minutes.

The metadata table is transactional with the data table. Do not copy, delete, or edit its files independently.

Inspect it with Hudi SQL procedures or the CLI:

```sql
CALL show_metadata_table_partitions(table => 'orders');
CALL show_metadata_table_stats(table => 'orders');
```

If the metadata table is already behind or failing compaction, resolve that before increasing its write load.

## Select useful statistics columns

Column stats help only when queries use predicates that can exclude files through min/max ranges or null information. Good candidates include:

- Event timestamps and dates.
- Numeric range filters.
- Low-to-moderate-cardinality status values when files are clustered.
- Tenant or region fields when data layout gives them locality.

Poor candidates include:

- Large text or binary payloads.
- Columns rarely used in filters.
- Random UUIDs spread uniformly through every file.
- Complex types, which current Hudi SQL DDL documentation does not support for column and partition stats indexes.

Begin with two or three high-value columns rather than relying on Hudi's default selection of the first 32 schema columns.

## Enable column stats on the writer

Use the current metadata settings:

```python
metadata_options = {
    "hoodie.metadata.enable": "true",
    "hoodie.metadata.index.column.stats.enable": "true",
    "hoodie.metadata.index.column.stats.column.list":
        "event_ts,order_total,status",
}
```

In Hudi 1.2, `hoodie.metadata.index.column.stats.column.list` is the exact property for an explicit comma-separated list. If it is unset, Hudi generates stats for the first `n` columns in the table schema, where `n` is controlled by `hoodie.metadata.index.column.stats.max.columns.to.index` and defaults to 32. An explicit column list overrides that maximum. Inspect the resulting `column_stats` metadata partition to confirm the deployed writer applied the intended list.

Spark SQL can also create an explicit index:

```sql
CREATE INDEX idx_event_ts
ON orders
USING column_stats(event_ts);
```

Choose one management path and keep every writer consistent. Do not have one writer enable an index while another disables it.

## Enable data skipping on readers

Building stats does not guarantee a reader will use them. For Spark:

```python
query = (
    spark.read.format("hudi")
    .option("hoodie.metadata.enable", "true")
    .option("hoodie.enable.data.skipping", "true")
    .load(table_path)
    .where("event_ts >= timestamp '2026-08-23 09:00:00'")
)
```

Verify the Spark plan and file count. Data skipping is strongest when files have narrow value ranges. If every file contains the full status or timestamp range, the index is accurate but cannot prune.

Clustering or sort order may improve locality and therefore the value of stats. Do not judge the index only on a randomly distributed test layout.

## Backfill without blocking regular writes

Enabling an index on an existing large table can require hours of scanning. Hudi supports async index creation and concurrent indexing:

```text
hoodie.metadata.index.async=true
hoodie.metadata.index.column.stats.enable=true
hoodie.write.concurrency.mode=optimistic_concurrency_control
hoodie.write.lock.provider=<shared-lock-provider>
```

The metadata-indexing guide requires the metadata table and a lock provider for async indexing. Schedule and monitor the indexing instant, and do not treat an enabled property as proof that the backfill completed.

For the safest rollout:

1. Benchmark on a table clone.
2. Enable a narrow column set.
3. Backfill during a lower-write period.
4. Verify index completion.
5. Enable data skipping for a canary reader.
6. Compare files scanned, latency, and correctness.

## Measure writer and metadata cost

Track before and after:

- Data commit duration.
- Metadata-table commit duration.
- Metadata bytes written per data commit.
- Pending metadata compaction and log compaction.
- Index partition file-group sizes.
- Query files scanned and planning time.

The index is worthwhile when saved reader work exceeds the additional write and storage cost for your service objectives. High query speedup on one dashboard does not justify destabilizing a critical ingestion stream without resource planning.

## Keep configurations consistent in multi-writer tables

Hudi 1.2 automatically deletes metadata partitions whose indexes are disabled in write configuration. This is convenient for one controlled writer, but dangerous when multiple writers use different settings.

Current Hudi exposes:

```text
hoodie.metadata.auto.delete.partitions=false
```

Use it to prevent accidental deletion when configuration cannot be made uniform immediately, then manage index removal explicitly through SQL or CLI. The preferred fix is still one versioned configuration consumed by all writers.

Disabling the entire metadata table and immediately re-enabling it is also unsafe. Hudi documentation advises waiting several commits for cleanup before re-enabling after a disable.

## Troubleshoot ineffective skipping

If query performance does not change:

1. Confirm the `column_stats` metadata partition exists and is completed.
2. Confirm the reader enabled metadata and data skipping.
3. Confirm the predicate uses an indexed supported column.
4. Check casts or functions that prevent the predicate matching raw stats.
5. Compare min/max overlap across active files.
6. Check whether the reader engine supports the metadata index.

Trino's current Hudi connector no longer reads Hudi's metadata table, while other engines have their own settings. Do not assume a writer-side index accelerates every engine.

## Official Documentation

- [Apache Hudi table metadata](https://hudi.apache.org/docs/metadata/)
- [Apache Hudi metadata indexing](https://hudi.apache.org/docs/metadata_indexing/)
- [Apache Hudi configuration reference](https://hudi.apache.org/docs/configurations/)
- [Apache Hudi Spark SQL DDL](https://hudi.apache.org/docs/sql_ddl/)
- [Apache Hudi performance guidance](https://hudi.apache.org/docs/performance/)
- [Apache Hudi SQL procedures](https://hudi.apache.org/docs/procedures/)

## Conclusion

Enable metadata-backed file listing first, then add column stats only for predicates that can prune real files. Backfill large indexes with explicit concurrency controls, measure writer and metadata service cost, verify reader plans, and keep index configuration identical across all writers.
