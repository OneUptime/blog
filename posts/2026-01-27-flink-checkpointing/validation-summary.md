# Validation Summary: How to Configure Flink Checkpointing

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Flink
- Flink checkpointing and savepoints
- Flink state backends
- RocksDB / EmbeddedRocksDBStateBackend
- Flink restart and failover strategies
- Flink CLI and REST API
- YAML configuration
- Java DataStream API configuration

## Sources Consulted
- Apache Flink Checkpointing documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/checkpointing/
- Apache Flink Checkpoints documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpoints/
- Apache Flink State Backends documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/state_backends/
- Apache Flink Savepoints documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/savepoints/
- Apache Flink Checkpoints vs. Savepoints documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpoints_vs_savepoints/
- Apache Flink Task Failure Recovery documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/task_failure_recovery/
- Apache Flink Configuration reference: https://nightlies.apache.org/flink/flink-docs-stable/docs/deployment/config/
- Apache Flink CLI documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/deployment/cli/
- Apache Flink REST API documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/rest_api/
- Apache Flink JavaDoc for CheckpointConfig, StreamExecutionEnvironment, HashMapStateBackend, FileSystemCheckpointStorage, EmbeddedRocksDBStateBackend, and PredefinedOptions: https://nightlies.apache.org/flink/flink-docs-stable/api/java/

## Issues Found
- The checkpointing explanation said checkpoints capture in-flight records generally. Updated it to state that normal checkpoints capture operator state and source offsets, while unaligned checkpoints can include in-flight buffer data.
- Replaced deprecated externalized checkpoint Java API usage with `setExternalizedCheckpointRetention(ExternalizedCheckpointRetention.RETAIN_ON_CANCELLATION)`.
- Updated obsolete configuration keys: `state.checkpoints.dir`, `state.checkpoints.num-retained`, `state.savepoints.dir`, `state.backend.incremental`, and `execution.checkpointing.unaligned`.
- Updated Java state backend and restart strategy examples to use current Flink configuration APIs instead of removed/deprecated per-environment setters.
- Replaced old RocksDB package references under `org.apache.flink.contrib.streaming.state` with current configuration-based RocksDB setup.
- Removed the invalid `flink savepoint ... --cancel` CLI example and kept the supported `flink stop --savepointPath ...` command.
- Replaced the nonexistent `execution.savepoint.format` configuration example with the supported CLI `--type canonical` savepoint format selection.
- Corrected the retained checkpoint default from `3` to `1`.

## Review Notes
The article is now aligned with the current stable Apache Flink documentation. Some examples remain illustrative snippets rather than complete, standalone Java classes; future revisions could add full imports for every isolated snippet if the blog wants copy-paste compilability throughout.
