# Validation Summary: How to Build State Checkpointing

## Status
validated

## Post Type
Tutorial / Conceptual guide

## Technologies Covered
- Apache Flink (checkpoint coordinator, barriers, alignment, unaligned checkpoints, recovery)
- RocksDB (via rocksdbjni: DBOptions, ColumnFamilyOptions, BlockBasedTableConfig, BloomFilter, LRUCache, FlushOptions)
- Java (Serializable, ConcurrentHashMap, CopyOnWriteArrayList, AtomicLong, CompletableFuture)
- Hadoop FileSystem API (FSDataOutputStream / FSDataInputStream / Path)
- Distributed snapshot algorithm (Chandy-Lamport-style asynchronous barriers)
- State TTL, custom TypeSerializer, Flink Metrics (Counter, Gauge, Histogram)

## Sources Consulted
- Apache Flink master CheckpointConfig Javadoc: https://nightlies.apache.org/flink/flink-docs-master/api/java/org/apache/flink/streaming/api/environment/CheckpointConfig.html
- Apache Flink State Backends docs: https://nightlies.apache.org/flink/flink-docs-master/docs/ops/state/state_backends/
- FLINK-34615 (rename `ExternalizedCheckpointCleanup` → `ExternalizedCheckpointRetention`)
- FLINK-36274 (removal of deprecated `ExternalizedCheckpointCleanup`)
- FLINK-32570 / FLINK-34522 (deprecation of `org.apache.flink.api.common.time.Time` in favor of `java.time.Duration`)
- Apache Flink `StateTtlConfig` source: https://github.com/apache/flink/blob/master/flink-core/src/main/java/org/apache/flink/api/common/state/StateTtlConfig.java
- RocksDB JNI source: `DBOptions.java`, `BlockBasedTableConfig.java`, `BloomFilter.java`, `LRUCache.java`, `FlushOptions.java` on github.com/facebook/rocksdb

## Issues Found
1. **Removed Flink API** — `checkpointConfig.setExternalizedCheckpointCleanup(ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION)` was renamed (FLINK-34615) and the old form was removed entirely (FLINK-36274). Changed to `setExternalizedCheckpointRetention(ExternalizedCheckpointRetention.RETAIN_ON_CANCELLATION)`. The custom `CheckpointConfig` example earlier in the post already correctly used `ExternalizedCheckpointRetention`, so the Flink example now matches.
2. **Deprecated Flink API** — `StateTtlConfig.newBuilder(Time.milliseconds(ttl.toMillis()))` uses `org.apache.flink.api.common.time.Time`, which is deprecated. Since `ttl` is already a `java.time.Duration` and `newBuilder` accepts `Duration` directly, simplified to `StateTtlConfig.newBuilder(ttl)`.

## Review Notes
- Most of the Java code (CheckpointCoordinator, BarrierAligner, FileSystemCheckpointStorage, CheckpointRecoveryManager, UnalignedCheckpointHandler, CompactStateSerializer) is illustrative pseudo-implementation rather than real framework code. The structure correctly reflects the Chandy-Lamport asynchronous-barrier algorithm used by Flink, and the Java is syntactically valid.
- Real Flink/RocksDB API calls were verified against current docs: `enableCheckpointing`, `setCheckpointTimeout`, `setMinPauseBetweenCheckpoints`, `setMaxConcurrentCheckpoints`, `enableUnalignedCheckpoints`, `setCheckpointStorage(String)`, `EmbeddedRocksDBStateBackend`, `StateTtlConfig.UpdateType.OnReadAndWrite`, `StateVisibility.NeverReturnExpired`, `cleanupFullSnapshot()`, `new BloomFilter(10)`, `BlockBasedTableConfig.setFilterPolicy/setBlockCache`, `DBOptions.setCreateIfMissing/setCreateMissingColumnFamilies/setMaxBackgroundJobs/setMaxOpenFiles`, `db.flush(new FlushOptions().setWaitForFlush(true))` — all current and correct.
- `setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE)` is being soft-deprecated in favor of `setCheckpointingConsistencyMode(org.apache.flink.core.execution.CheckpointingMode.EXACTLY_ONCE)`, but the existing form is still functional and widely used. Left as-is for consistency with the custom `CheckpointConfig` builder shown earlier.
- The illustrative `env.addSource(new KafkaSource<>())` / `events.addSink(new KafkaSink<>())` would, with real Flink Kafka connector classes (`KafkaSource` / `KafkaSink` implementing the new Source/Sink2 APIs), need `env.fromSource(...)` and `events.sinkTo(...)`. Since the `<>` generics are placeholders and the code is conceptual, this wasn't changed.
