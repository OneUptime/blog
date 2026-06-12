# Validation Summary: How to Implement Flink Exactly-Once Processing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Flink
- Flink checkpointing and state backends
- Embedded RocksDB state backend
- Apache Kafka source and sink connectors
- Kafka transactions
- Java DataStream API
- Prometheus alert rules

## Sources Consulted
- Apache Flink checkpointing documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/checkpointing/
- Apache Flink state backend documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/state_backends/
- Apache Flink Kafka connector documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/datastream/kafka/
- Apache Flink checkpointing under backpressure documentation: https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpointing_under_backpressure/
- Apache Flink deprecated API list: https://nightlies.apache.org/flink/flink-docs-stable/api/java/deprecated-list.html
- Apache Flink Sink API Javadocs: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/api/connector/sink2/Sink.html
- Apache Flink SinkWriter API Javadocs: https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/api/connector/sink2/SinkWriter.html
- Apache Kafka producer configuration documentation: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka consumer configuration documentation: https://docs.confluent.io/platform/current/installation/configuration/consumer-configs.html

## Issues Found
- The introduction overstated exactly-once semantics as guaranteeing every record is literally processed exactly once and results are always correct regardless of failures. Updated wording to describe Flink's actual guarantee: stateful computations behave as if each record affected state once, with end-to-end guarantees depending on compatible sources and sinks.
- The prerequisites named Apache Flink 1.17 or higher while several snippets were being updated for current non-deprecated Flink APIs. Updated the prerequisite to Apache Flink 2.2 for the APIs shown, with a note to adapt package names for Flink 1.x.
- Checkpointing examples used deprecated `org.apache.flink.streaming.api.CheckpointingMode` and `setCheckpointingMode`. Updated to `org.apache.flink.core.execution.CheckpointingMode` and `setCheckpointingConsistencyMode`.
- The minimum-pause comment said a checkpoint taking 8 seconds would be followed 2 seconds later despite configuring a 500 ms pause. Corrected the comment to 0.5 seconds.
- The RocksDB state backend import used the deprecated `org.apache.flink.contrib.streaming.state.EmbeddedRocksDBStateBackend` package. Updated it to `org.apache.flink.state.rocksdb.EmbeddedRocksDBStateBackend`.
- The Kafka source example used an incorrect nested `OffsetsInitializer.OffsetResetStrategy` reference. Updated it to Kafka's `OffsetResetStrategy`.
- The Kafka source comments implied committing offsets to Kafka makes source position part of the checkpoint. Corrected this: Flink checkpoints source state for fault tolerance, while Kafka offset commits expose consumer progress.
- The Kafka end-to-end explanation omitted that downstream Kafka consumers need `isolation.level=read_committed` to avoid aborted transactional records. Added that requirement.
- Kafka transaction timeout guidance only compared the timeout to the checkpoint interval. Updated it to cover maximum checkpoint duration plus restart time and to not exceed broker `transaction.max.timeout.ms`.
- The complete Kafka job omitted imports and Kafka transaction timeout configuration used elsewhere. Added the missing imports and transaction timeout setting.
- The custom database two-phase-commit example incorrectly committed the database transaction in `preCommit`, which would make rollback impossible after a failed checkpoint. Changed it to prepare the transaction in `preCommit` and commit the prepared transaction only after the checkpoint succeeds.
- The custom sink section presented `TwoPhaseCommitSinkFunction` as current. Updated wording and import to identify it as a legacy Flink 1.x pattern.
- The idempotent sink example used the deprecated legacy `SinkFunction`. Updated it to the current Sink API with `Sink` and `SinkWriter`.
- The unaligned checkpoint comment described `setAlignedCheckpointTimeout` as a byte threshold. Corrected it to a duration before switching from aligned to unaligned checkpointing.
- The conclusion claimed idempotent writes achieve the same guarantees as exactly-once sinks. Qualified this to equivalent observable results for deterministic updates.

## Review Notes
The article is now technically valid for the current Flink 2.2 API surface in the reviewed snippets. The custom exactly-once database sink remains illustrative because a real implementation requires a database-specific durable prepare/commit mechanism and serializable transaction metadata.
