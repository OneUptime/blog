# Choose a Hudi Index: Bloom, Simple, Global, or Record-Level

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Indexing, Bloom Index, Record-Level Index, Data Lakehouse

Description: Select a Hudi write index by matching key scope, update locality, lookup cost, partition movement, and metadata overhead.

---

Hudi's write index maps an incoming record key, optionally paired with a partition path, to the file group that already contains that record. The correct index makes upserts and deletes touch only relevant files. The wrong one can scan far more data, fail to find a moved record, or enforce uniqueness at the wrong scope.

Apache Hudi 1.2.x offers multiple index families. For Spark, `SIMPLE` is the documented default, while Bloom, global variants, bucket indexes, and metadata-backed Record-Level Indexes serve different access patterns.

## Decide uniqueness scope first

With a non-global index, identity is:

```text
(partition path, record key)
```

The writer must supply the same partition path for every update and delete. This limits lookup to the incoming partitions and scales with changed data rather than full table size.

With a global index, identity is the record key alone. Hudi searches across partitions and can enforce one key table-wide. Use this when:

- An entity can move between partitions.
- Producers do not know its original partition.
- The business key must be globally unique.

Do not choose a global index only because it sounds safer. Hudi's documentation notes that traditional global Simple and Bloom lookup can grow with table size. A stable partition contract is often the fastest index.

## Understand Simple index

`SIMPLE` joins incoming keys with keys read from candidate data files. It avoids Bloom false positives and is straightforward for workloads that already touch a large fraction of files.

It fits:

- Random updates spread broadly through a dimension table.
- Moderate tables where reading key columns is affordable.
- Workloads where Bloom filters would report candidates across many files.

Configure:

```text
hoodie.index.type=SIMPLE
```

`GLOBAL_SIMPLE` performs the corresponding lookup across all partitions. It can handle partition movement through `hoodie.simple.index.update.partition.path`, which is documented as enabled by default for that index. Test delete-plus-insert movement and its cost explicitly.

Simple lookup is not `no index`. It performs a distributed join and can be expensive when a tiny update targets a huge table.

## Understand Bloom index

`BLOOM` stores Bloom filters for record keys in base-file footers. During lookup, Hudi prunes candidate files and tests the filter before confirming exact matches.

It fits:

- Large fact tables with updates concentrated in a small set of partitions.
- Keys whose ranges help prune files.
- Workloads where most files can be excluded cheaply.

Configure:

```text
hoodie.index.type=BLOOM
```

Bloom filters can return false positives, never false negatives when correctly built. A false positive causes extra file checking but not an incorrect upsert. The filter must be sized for records per file and desired false-positive rate; Hudi also supports dynamic Bloom behavior and metadata-assisted Bloom lookup.

`GLOBAL_BLOOM` searches across partitions and supports partition-path update behavior through `hoodie.bloom.index.update.partition.path`. Its table-wide cost can become significant on very large datasets.

## Understand Record-Level Index

The Record-Level Index stores key-to-location mappings in the Hudi metadata table, sharded by hash. It avoids repeatedly deriving locations from data-file keys and is designed for fast lookup at large scale.

Hudi 1.2 distinguishes:

- `GLOBAL_RECORD_LEVEL_INDEX` for key uniqueness across the table.
- `RECORD_LEVEL_INDEX` for uniqueness of partition path plus key.

Writer selection:

```text
hoodie.index.type=GLOBAL_RECORD_LEVEL_INDEX
hoodie.metadata.enable=true
hoodie.metadata.global.record.level.index.enable=true
```

For partition-scoped lookup:

```text
hoodie.index.type=RECORD_LEVEL_INDEX
hoodie.metadata.enable=true
hoodie.metadata.record.level.index.enable=true
```

The older `hoodie.metadata.record.index.enable` global flag is deprecated in favor of `hoodie.metadata.global.record.level.index.enable`.

RLI shifts cost into metadata maintenance. Size its file groups for current and expected record count, monitor metadata compaction, and keep every writer on the same metadata configuration.

## Use a decision table

| Workload | First index to test | Reason |
| --- | --- | --- |
| Updates know stable partition | SIMPLE or BLOOM | Partition-local lookup |
| Updates concentrated in recent fact partitions | BLOOM | Strong file pruning |
| Random updates touch most files | SIMPLE | Direct key join avoids weak Bloom pruning |
| Global keys on a large table | GLOBAL_RECORD_LEVEL_INDEX | Scalable metadata mapping |
| Huge partitioned table with local keys | RECORD_LEVEL_INDEX | Partitioned metadata mapping |
| Small table with occasional key movement | GLOBAL_SIMPLE or GLOBAL_BLOOM | Simpler global option may suffice |

This table provides candidates, not guaranteed winners. Data distribution and file layout determine real cost.

## Benchmark with representative writes

Replay:

- New inserts.
- Updates to hot and cold partitions.
- Deletes.
- A partition move.
- A retry with identical keys.
- A batch containing missing keys.

Measure index lookup duration, shuffle, files read, commit duration, metadata-table write time, and duplicate results. Use the same record keys, partitions, and file layout for every comparison.

A synthetic test with sequential keys in one partition favors different behavior from random production keys spread over years of partitions.

## Account for operations

Global uniqueness does not repair existing duplicates. Clean or rewrite them before relying on the new contract.

Metadata-backed indexes need metadata-table compaction and monitoring. Traditional Bloom and Simple indexes avoid that specific mapping state but spend more work deriving locations. All writers and table services must use compatible Hudi versions and index settings.

Index type is closely tied to partition movement. Verify whether the chosen index moves a record to the new incoming path or updates it in the original path. A successful commit with the wrong movement semantics is still a data-model failure.

## Verify location and uniqueness

Hudi CLI can query the Record-Level Index:

```text
metadata lookup-record-index --record_key order-1042
```

For a partitioned RLI, also pass `--partition_path`. In Spark, group the snapshot by business key and inspect `_hoodie_partition_path` and `_hoodie_file_name` for test keys.

Track index lookup latency separately from the file-writing phase. Otherwise a faster index can be hidden by compaction or shuffle changes.

## Official Documentation

- [Apache Hudi indexes](https://hudi.apache.org/docs/indexes/)
- [Apache Hudi metadata indexing](https://hudi.apache.org/docs/metadata_indexing/)
- [Apache Hudi table metadata](https://hudi.apache.org/docs/metadata/)
- [Apache Hudi CLI](https://hudi.apache.org/docs/cli/)
- [Apache Hudi key generation](https://hudi.apache.org/docs/key_generation/)

## Conclusion

Choose index scope before implementation. Test Simple for broad random updates, Bloom for strongly prunable fact-table changes, and Record-Level Index for scalable metadata-backed location lookup. Use global variants only when table-wide identity or partition movement requires them, and benchmark the full write path.
