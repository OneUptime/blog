# Merge Small Hudi Files After bulk_insert with Clustering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Clustering, Bulk Insert, Small Files, Spark

Description: Consolidate small Hudi files created by bulk_insert with a measured clustering plan, safe execution, and post-run verification.

---

Hudi's `bulk_insert` operation is designed for high-throughput initial loads. It uses a scalable, disk-based path and does not perform normal write-time auto-sizing. With the default `NONE` bulk-insert sort mode, its file count follows input partitioning closely, so an over-partitioned Spark DataFrame can produce many small Parquet files.

Clustering is Hudi's table service for fixing that layout. It rewrites eligible file groups into better-sized output files and can optionally sort rows for data skipping. It is different from Merge-on-Read compaction: compaction merges delta logs into base files, while clustering reorganizes base-file layout.

This guide targets Apache Hudi 1.2.x.

## Confirm the problem before rewriting

Count current Hudi base files through Hudi metadata, the CLI, or an object-store inventory. Group sizes by table partition and calculate at least the median and 10th percentile. Averages hide partitions containing thousands of tiny objects.

Also record query planning time, files scanned for representative filters, and the total bytes in each affected partition. Clustering a 12 MB partition into a 1 GB target cannot produce a 1 GB file. The smallest practical output remains bounded by available data and the grouping strategy.

Do not mistake old file versions for active small files. Hudi keeps immutable versions until cleaning. Use a Hudi-aware file-system view or snapshot tooling rather than recursively counting every Parquet object under the base path.

## Prevent avoidable files in the initial load

For future bulk loads, match input partitions to expected output:

```python
sorted_input = source.repartition("event_date")

options = {
    "hoodie.table.name": "orders",
    "hoodie.datasource.write.operation": "bulk_insert",
    "hoodie.datasource.write.recordkey.field": "order_id",
    "hoodie.datasource.write.partitionpath.field": "event_date",
    "hoodie.bulkinsert.sort.mode": "GLOBAL_SORT",
}

sorted_input.write.format("hudi").options(**options).mode("append").save(table_path)
```

`GLOBAL_SORT` generally produces the best packing but pays for a global sort. `PARTITION_SORT` is a middle ground. `NONE` is fastest and has the least sorting overhead. Choose using a real load test, not only final file count.

Even a well-tuned load can leave small tail files, especially across many low-volume table partitions. Clustering remains the post-write repair tool.

## Build a size-based clustering plan

The standard Spark size-based plan strategy selects files below `hoodie.clustering.plan.strategy.small.file.limit`, groups candidates, and aims for `hoodie.clustering.plan.strategy.target.file.max.bytes` outputs.

An example starting point uses a 120 MiB output target to align with Hudi's normal default Parquet target:

```text
hoodie.clustering.plan.strategy.small.file.limit=104857600
hoodie.clustering.plan.strategy.target.file.max.bytes=125829120
hoodie.clustering.plan.strategy.max.bytes.per.group=503316480
hoodie.clustering.execution.strategy.class=org.apache.hudi.client.clustering.run.strategy.SparkSortAndSizeExecutionStrategy
```

These are examples, not universal recommendations. Hudi's clustering defaults are larger than its normal Parquet auto-sizing target, so set both candidate and output sizes deliberately. Ensure the maximum bytes per group is large enough to form useful outputs but small enough for executor memory, shuffle, and task duration.

If queries filter frequently on `customer_id` and `event_ts`, add:

```text
hoodie.clustering.plan.strategy.sort.columns=customer_id,event_ts
```

Sorting increases shuffle work. Skip it when the objective is only file consolidation and the query engine will not exploit the order.

## Schedule and execute explicitly

With Hudi's Spark SQL extension, the current procedure can schedule and execute clustering:

```sql
CALL run_clustering(
  table => 'orders',
  options => '
    hoodie.clustering.plan.strategy.small.file.limit=104857600,
    hoodie.clustering.plan.strategy.target.file.max.bytes=125829120,
    hoodie.clustering.plan.strategy.max.bytes.per.group=503316480'
);
```

For stricter control, separate the phases:

```sql
CALL run_clustering(table => 'orders', op => 'schedule');
CALL show_clustering(table => 'orders');
CALL run_clustering(
  table => 'orders',
  op => 'execute',
  instants => 'CLUSTERING_INSTANT'
);
```

The clustering plan is persisted on the timeline. Execution publishes a replace commit that atomically replaces old file groups with the new layout. Readers continue to see a consistent snapshot while the rewrite runs.

For a recurring pipeline, inline clustering uses `hoodie.clustering.inline=true` and `hoodie.clustering.inline.max.commits`. Async clustering uses `hoodie.clustering.async.enabled=true` and `hoodie.clustering.async.max.commits`. A separate `HoodieClusteringJob` can isolate resources but creates a multi-process deployment that needs concurrency planning and lock configuration.

## Avoid update conflicts

Current Hudi documentation states that clustering should target file groups that are not receiving concurrent updates. The default Spark update strategy rejects conflicting updates. This matters when clustering a table immediately after its initial load while a CDC job starts updating the same partitions.

Safer options are:

- Finish and validate initial clustering before starting mutable ingestion.
- Restrict clustering to closed date partitions.
- Select explicit partitions or a partition regex in the plan.
- Use documented concurrency settings and test any non-default update strategy.

Do not cluster the hottest partition first merely because it has the most small files. It is also the most likely to conflict.

## Verify the result and let cleaning finish

After clustering completes:

1. Confirm the replace commit is completed, not merely requested.
2. Recalculate active file-size percentiles.
3. Compare snapshot row count and key-level checksums from before and after.
4. Re-run representative queries and record files scanned.
5. Check that ingestion and incremental consumers continued correctly.

Old small files can remain physically present until Hudi's cleaner removes obsolete file slices. That is expected MVCC behavior. Do not delete them directly from S3.

If output files are still small, inspect bytes available per table partition, group-size caps, and the number of output groups. If the plan contains no candidates, verify the candidate limit and make sure you are inspecting active file slices. If clustering stays requested or inflight, investigate the Spark job and timeline rather than scheduling more overlapping plans.

## Official Documentation

- [Apache Hudi file sizing](https://hudi.apache.org/docs/file_sizing/)
- [Apache Hudi clustering](https://hudi.apache.org/docs/clustering/)
- [Apache Hudi write operations](https://hudi.apache.org/docs/write_operations/)
- [Apache Hudi SQL procedures](https://hudi.apache.org/docs/procedures/)
- [Apache Hudi cleaning](https://hudi.apache.org/docs/cleaning/)

## Conclusion

Use bulk insert to optimize load throughput, then use clustering to optimize the durable layout. Measure active file sizes, choose candidate and target limits from the table's real partition volumes, avoid hot-file update conflicts, and verify the replace commit before relying on the improved layout.
