# Hudi Copy-on-Write vs Merge-on-Read: A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Copy-on-Write, Merge-on-Read, Compaction, Data Lakehouse

Description: Choose a Hudi table type by comparing update cost, data freshness, query latency, engine support, and compaction operations.

---

Apache Hudi's Copy-on-Write and Merge-on-Read table types expose similar record-level operations but pay their storage costs at different times. Copy-on-Write rewrites affected base files during a commit. Merge-on-Read can append changes to log files and merge them later, during either a snapshot read or compaction.

The decision is therefore not simply batch versus streaming. It is a choice about where to place merge work, how fresh each reader must be, and who will operate compaction.

This guide uses the Apache Hudi 1.2.x model and calls the table types COW and MOR.

## Understand the write path

A Hudi table is organized into file groups. In COW, the current file slice is represented by a columnar base file. Updating one row causes Hudi to produce a new version of the affected base file. Readers get efficient Parquet scans because no row-based delta logs need to be merged at query time.

In MOR, a file slice can include a base file plus one or more log files. Updates can be appended to logs, reducing write amplification and commit latency. Snapshot readers merge the base and logs to return the latest state. Compaction later combines them into a new base file.

That yields the central trade-off:

| Concern | Copy-on-Write | Merge-on-Read |
| --- | --- | --- |
| Update I/O | Rewrites affected base files per commit | Appends changes, then compacts |
| Snapshot read | Direct columnar read | Merges base and logs |
| Operations | Simpler | Requires compaction policy and monitoring |
| Fresh read support | Snapshot is current | Snapshot is current; read-optimized can lag |
| Engine compatibility | Broad | Depends on engine and query type |

Inserts into new file groups can look similar for both types. The difference becomes material when updates and deletes repeatedly touch existing file groups.

## Measure update density, not just update count

Suppose one micro-batch updates 100,000 rows:

- If those rows are concentrated in ten file groups, COW rewrites ten base files and may be entirely acceptable.
- If they are scattered across thousands of file groups, COW write amplification can dominate the job.
- MOR can append the scattered changes quickly, but a snapshot reader must open and merge the resulting logs until compaction catches up.

Profile the number of touched file groups, bytes rewritten per input byte, and growth of unmerged log data. A raw updates-per-second metric does not capture this distribution.

COW tends to fit slowly changing dimensions, curated tables, and read-heavy datasets. MOR tends to fit high-frequency CDC, near-real-time ingestion, and workloads where write latency matters more than the cost of merging on read.

## Choose the reader contract

Hudi defines several query modes:

- A snapshot query returns the latest committed state. For MOR, this requires merging base and log files.
- A read-optimized query uses the latest compacted base files. It avoids log merging but can omit delta commits newer than the last compaction.
- An incremental query returns records changed within a timeline range.

COW snapshot reads are naturally read optimized. MOR makes freshness and latency selectable, but only if your query engine supports the required mode.

Spark has first-class Hudi support for MOR snapshot and read-optimized queries. External engines can be narrower. Current Trino Hudi connector documentation lists COW snapshot and MOR read-optimized support, not MOR snapshot merging. Athena supports snapshot and read-optimized queries for its supported Hudi connector versions, but also documents version and datatype limitations.

Build a reader matrix before choosing MOR:

| Consumer | Required freshness | Query type available | Acceptable lag |
| --- | --- | --- | --- |
| Spark fraud pipeline | Latest commit | Snapshot | None |
| Trino dashboard | Last compaction | Read optimized | 15 minutes |
| Athena ad hoc users | Latest supported snapshot | Snapshot | None |

If a critical engine can read only compacted base files, your compaction interval becomes a data-freshness SLA.

## Price compaction explicitly

Compaction is only applicable to MOR. It reads a base file and its log files, applies the table's record merge mode, and writes a new base-file version. It consumes I/O and compute that COW paid gradually on each update.

Questions to answer before production:

1. Will compaction run inside the streaming process or as a separate job?
2. Is it triggered by commit count, elapsed time, or a combination?
3. Which file groups will the compaction strategy prioritize?
4. What is the maximum acceptable log backlog?
5. Does the cluster reserve enough executors for ingestion during compaction?

MOR is not cheaper by definition. It lets you batch and schedule merge work. The gain comes when batching reduces repeated rewrites or when moving work away from the ingestion critical path has operational value.

## Run a workload-based comparison

Create two tables with identical keys, partitions, file-size settings, and merge mode:

```python
common = {
    "hoodie.table.name": table_name,
    "hoodie.datasource.write.operation": "upsert",
    "hoodie.datasource.write.recordkey.field": "order_id",
    "hoodie.datasource.write.partitionpath.field": "event_date",
    "hoodie.table.ordering.fields": "source_lsn",
}

cow = {**common, "hoodie.datasource.write.table.type": "COPY_ON_WRITE"}
mor = {**common, "hoodie.datasource.write.table.type": "MERGE_ON_READ"}
```

Replay representative inserts, updates, deletes, retries, and late events. Measure:

- Commit duration and bytes written.
- Snapshot latency at typical filter selectivity.
- MOR read-optimized freshness.
- Compaction duration and backlog.
- Object count and average file size.
- CPU and memory on each reader.

Do not benchmark an insert-only sample if production is update-heavy. Do not compare a freshly compacted MOR table with a COW table after weeks of scattered changes.

## Avoid false decision rules

`Streaming means MOR` is too broad. A streaming pipeline that mostly inserts into new partitions can use COW successfully. `Dashboards mean COW` is also too broad when dashboards accept compacted data and ingestion needs low latency.

Table type is persisted and should be treated as architectural state. Hudi CLI can change types, but moving MOR to COW requires compacting remaining log files first to avoid losing unmerged changes. A production migration deserves a staged read and count comparison, not a property edit during active ingestion.

## Operational signals

For COW, alert on long commits, excessive files rewritten per batch, and small-file growth. For MOR, also alert on pending compactions, delta commits since the last compaction, log-file bytes and blocks, snapshot latency, and the gap between snapshot and read-optimized results.

A useful correctness probe compares key counts and a checksum between MOR snapshot results and read-optimized results immediately after a compaction. They should converge at the completed compaction boundary.

## Official Documentation

- [Apache Hudi technical specification](https://hudi.apache.org/learn/tech-specs/)
- [Apache Hudi compaction](https://hudi.apache.org/docs/compaction/)
- [Apache Hudi Spark quick start](https://hudi.apache.org/docs/quick-start-guide/)
- [Trino Hudi connector](https://trino.io/docs/current/connector/hudi.html)
- [Amazon Athena Hudi considerations](https://docs.aws.amazon.com/athena/latest/ug/querying-hudi-in-athena-considerations-and-limitations.html)

## Conclusion

Choose COW when predictable, low-overhead reads and operational simplicity outweigh per-update rewrites. Choose MOR when delaying and batching merge work materially improves ingestion and your readers can tolerate or understand the resulting query modes. Validate the choice with touched-file distribution, reader support, and a real compaction budget.
