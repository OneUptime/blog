# Validation Summary: How to Create State Backends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Flink (Stream Processing)
- HashMapStateBackend
- EmbeddedRocksDBStateBackend
- RocksDB (DBOptions, ColumnFamilyOptions, BlockBasedTableConfig, BloomFilter, LRUCache)
- Flink CheckpointConfig and Checkpointing
- Flink StateTtlConfig (state TTL)
- Flink Metrics (Counter, Histogram, Gauge)
- Flink YAML configuration (flink-conf.yaml, execution.checkpointing.*, state.backend.*)
- Caffeine cache (used in custom backend example)

## Sources Consulted
- Apache Flink stable Java API docs: `EmbeddedRocksDBStateBackend` — https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/state/rocksdb/EmbeddedRocksDBStateBackend.html
- Apache Flink stable Java API docs: `CheckpointConfig` — https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/streaming/api/environment/CheckpointConfig.html
- Apache Flink stable Java API docs: `StateTtlConfig` and `StateTtlConfig.Builder` — https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/api/common/state/StateTtlConfig.html
- Apache Flink State Backends documentation — https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/state_backends/
- RocksDB Tuning Guide — https://github.com/facebook/rocksdb/wiki/RocksDB-Tuning-Guide

## Issues Found

1. **Non-existent method `enableIncrementalCheckpointing(boolean)` on `EmbeddedRocksDBStateBackend`** (Basic RocksDB Configuration section).
   - The original code called `rocksDBBackend.enableIncrementalCheckpointing(true);` after construction. This method does not exist; `EmbeddedRocksDBStateBackend` exposes only the constructor `EmbeddedRocksDBStateBackend(boolean enableIncrementalCheckpointing)` (and a `TernaryBoolean` overload) to enable incremental checkpointing.
   - Fixed by switching to `new EmbeddedRocksDBStateBackend(true)` and removing the invalid setter call.

2. **Non-existent method `CheckpointConfig.setForceCheckpointing(boolean)`** (Checkpoint Tuning section).
   - The original code called `config.setForceCheckpointing(true);` to "force checkpointing in iterative jobs". This method has been removed from `CheckpointConfig` in current stable Flink (the closest existing API is `setForceUnalignedCheckpoints`, which has a different purpose).
   - Fixed by removing the invalid call entirely (and its preceding comments). No equivalent for the originally described behavior remains.

3. **Deprecated/renamed method `setExternalizedCheckpointCleanup`** (Checkpoint Tuning section).
   - The original code called `config.setExternalizedCheckpointCleanup(CheckpointConfig.ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);`. In current stable Flink this has been renamed to `setExternalizedCheckpointRetention(ExternalizedCheckpointRetention)`.
   - Fixed by updating to `config.setExternalizedCheckpointRetention(ExternalizedCheckpointRetention.RETAIN_ON_CANCELLATION);`.

4. **Deprecated/removed `Time` parameter to `StateTtlConfig.newBuilder`** (State TTL Configuration section).
   - The original code called `StateTtlConfig.newBuilder(Time.hours(1))`. In the current stable Flink API, `StateTtlConfig.newBuilder` accepts `java.time.Duration`, not `org.apache.flink.api.common.time.Time`.
   - Fixed by replacing with `StateTtlConfig.newBuilder(Duration.ofHours(1))`.

## Review Notes
- The post mixes correctly working examples with some clearly illustrative "reference" code (notably the custom state backend section, where a `(S)` cast appears that should be `(St)` to match the declared type parameter, and where `CustomKeyedStateHandle`, `CustomListState`, etc. are referenced without being defined). The post calls this out as a "reference implementation that demonstrates the key concepts," so I left it as-is — it is not meant to compile literally. Future revisions could clearly mark this code as pseudocode.
- `RichFunction.open(Configuration parameters)` (used by `UserEventCounter` and `StateBackendMetrics`) is the Flink 1.x signature. In Flink 2.0, the canonical override is `open(OpenContext openContext)`. Existing Flink 1.x users should be fine; if the post is republished against Flink 2.x, this should be updated.
- `setCheckpointingMode` / `CheckpointingMode` is technically deprecated in current stable Flink in favor of `setCheckpointingConsistencyMode` / `CheckpointingConsistencyMode`, but the deprecated API still works and remains widely used in tutorials. Left as-is.
- `BloomFilter(10, false)` works against current RocksDB JNI, but the two-argument constructor (`useBlockBasedBuilder`) is deprecated upstream in RocksDB; modern code prefers `new BloomFilter(10)`. Left as-is since it is not broken.
- The YAML configuration keys (`state.backend: rocksdb`, `state.backend.incremental`, `state.backend.rocksdb.*`, `execution.checkpointing.*`, `taskmanager.memory.*`) were spot-checked and match current Flink configuration documentation.
