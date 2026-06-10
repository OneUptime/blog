# Validation Summary: How to Build State Compaction

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RocksDB (Java JNI bindings)
- Apache Flink (state backend, checkpointing, state TTL)
- Prometheus Java client (metrics)
- LSM-tree compaction strategies (Level, Universal, FIFO)

## Sources Consulted
- RocksDB Java source: https://github.com/facebook/rocksdb/blob/master/java/src/main/java/org/rocksdb/CompressionType.java
- RocksDB Subcompaction wiki: https://github.com/facebook/rocksdb/wiki/Subcompaction
- RocksDB Thread Pool wiki: https://github.com/facebook/rocksdb/wiki/Thread-Pool
- CompactionOptionsUniversal JavaDoc: https://javadoc.io/static/org.rocksdb/rocksdbjni/5.11.3/org/rocksdb/CompactionOptionsUniversal.html
- AbstractCompactionFilter source: https://github.com/facebook/rocksdb/blob/master/java/src/main/java/org/rocksdb/AbstractCompactionFilter.java
- AbstractCompactionFilterFactory source: https://github.com/facebook/rocksdb/blob/master/java/src/main/java/org/rocksdb/AbstractCompactionFilterFactory.java
- Flink 1.13 State Backends docs: https://nightlies.apache.org/flink/flink-docs-release-1.13/docs/ops/state/state_backends/
- Flink StateTtlConfig docs (current Flink): https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/state/#state-time-to-live-ttl

## Issues Found

1. **Incorrect `CompressionType` enum identifier (two occurrences).** The post used `CompressionType.ZSTD`, which does not exist. The correct enum constant is `CompressionType.ZSTD_COMPRESSION` (matching the naming convention used by all other compression types: `LZ4_COMPRESSION`, `NO_COMPRESSION`, etc.). Fixed in `configureForBalanced` and `configureForLowMemory`.

2. **Incorrect comment on `setMaxSubcompactions(4)`.** The original comment read "Enable parallel compaction across column families / Useful when state has multiple namespaces." This is wrong: `max_subcompactions` controls parallelism *within a single compaction job* by splitting it into smaller subcompactions that run concurrently — it has nothing to do with column families. Comment updated to accurately describe the behavior.

3. **Invalid generic parameter on `AbstractCompactionFilter<Void>`.** The class is declared `AbstractCompactionFilter<T extends AbstractSlice<?>>`, so `Void` is not a valid type argument and the code would not compile. Changed to `AbstractCompactionFilter<Slice>` (the most common concrete `AbstractSlice` subclass) and added the corresponding `import org.rocksdb.Slice;`.

## Review Notes

- **Deprecated Flink API**: `RocksDBStateBackend` (used throughout) is deprecated since Flink 1.13 in favor of `EmbeddedRocksDBStateBackend` + a separate `CheckpointStorage`. The legacy class still works as a shim, so we left it for now, but readers running Flink 1.13+ should prefer the newer API.
- **Deprecated RocksDB DB options**: `setMaxBackgroundCompactions` and `setMaxBackgroundFlushes` are deprecated in favor of `setMaxBackgroundJobs`. The post uses both styles (the workload-tuning section already uses `setMaxBackgroundJobs`). Left as-is — both still function.
- **Deprecated Flink `Time` class**: `org.apache.flink.api.common.time.Time` is deprecated in favor of `java.time.Duration` in newer Flink versions. The code still compiles and runs.
- **`BloomFilter` constructor**: current RocksDB source uses `BloomFilter(double bitsPerKey, boolean useBlockBasedMode)`. The post passes `int` literals (e.g., `10`), which auto-widen to `double`, so the code is still correct.
- **Imports**: several example classes (e.g., `BloomFilter`, `LRUCache`, `RocksDBOptionsFactory`, `ColumnFamilyOptions`, `Options` in some files, `CompressionType` in `FIFOCompactionConfig.java`) are referenced without explicit `import` statements. This is typical for illustrative blog snippets; readers will need to add the relevant `org.rocksdb.*` and `org.apache.flink.contrib.streaming.state.*` imports when porting to a real project.
- **`setSizeRatio(1)`** is technically the RocksDB default (1 percent). The inline comment "Files are merged when smallest/largest > ratio" is a simplification — the real trigger compares the sum of candidate file sizes to the next sorted run within a `size_ratio%` tolerance. Left as-is since the simplification is not actively misleading at the post's level.
