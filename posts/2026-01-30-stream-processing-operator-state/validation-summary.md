# Validation Summary: How to Build Operator State

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Apache Flink (DataStream API)
- Java
- Flink Operator State (ListState, UnionListState, BroadcastState)
- Flink Checkpointing and Fault Tolerance
- Stream Processing patterns (sources, sinks, broadcast)

## Sources Consulted
- [Apache Flink: Working with State](https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/state/)
- [Apache Flink: Checkpointing](https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/fault-tolerance/checkpointing/)
- [Apache Flink: CheckpointConfig Javadoc](https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/streaming/api/environment/CheckpointConfig.html)
- [Apache Flink: CheckpointListener Javadoc](https://nightlies.apache.org/flink/flink-docs-stable/api/java/org/apache/flink/api/common/state/CheckpointListener.html)
- [FLINK-34615: Rename ExternalizedCheckpointCleanup to ExternalizedCheckpointRetention](https://www.mail-archive.com/commits@flink.apache.org/msg59311.html)
- [FLINK-36274: Remove deprecated ExternalizedCheckpointCleanup](https://www.mail-archive.com/commits@flink.apache.org/msg60786.html)
- Apache Flink SourceFunction Javadoc (interface declaration)

## Issues Found

1. **`BufferedSinkWithOperatorState` did not implement `CheckpointListener`** — The class defined a `notifyCheckpointComplete(long checkpointId)` method but did not implement the `CheckpointListener` interface, so Flink would never invoke that method as a checkpoint-completion callback. `RichSinkFunction` does not extend `CheckpointListener`, so the interface must be added explicitly. Fixed by adding `implements ... CheckpointListener`, importing `org.apache.flink.api.common.state.CheckpointListener`, and adding an `@Override` annotation to the method.

2. **`RuleSource` used `extends` for the `SourceFunction` interface** — `org.apache.flink.streaming.api.functions.source.SourceFunction` is an interface, not a class, so `extends` is a syntax error. Changed to `implements`.

3. **Deprecated/removed `ExternalizedCheckpointCleanup` API** — The post used `config.setExternalizedCheckpointCleanup(CheckpointConfig.ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION)`. Per FLINK-34615 this enum was renamed to `ExternalizedCheckpointRetention` (now in `org.apache.flink.configuration`), and FLINK-36274 removed the deprecated name entirely. Updated the call to `config.setExternalizedCheckpointRetention(ExternalizedCheckpointRetention.RETAIN_ON_CANCELLATION)` and added the corresponding import.

## Review Notes
- The post intentionally uses the legacy `SourceFunction` / `RichSourceFunction` / `RichParallelSourceFunction` / `SinkFunction` APIs. These are deprecated in current Flink in favor of the FLIP-27 Source API and the new Sink API (FLIP-143/FLIP-191), but they remain functional and are still the standard way to demonstrate the `CheckpointedFunction` operator-state pattern in tutorial material. No change made.
- The `import org.apache.flink.streaming.api.CheckpointingMode;` is also deprecated in favor of `org.apache.flink.core.execution.CheckpointingMode` in recent releases, but the legacy import still resolves and matches the rest of the post's legacy-API style. Left as-is.
- `FileSourceWithOperatorState` imports `LongSerializer` and `StringSerializer` that are not used in the snippet. Harmless; not changed.
- `currentPosition += line.length() + 1` in `FileSourceWithOperatorState` is a rough approximation (assumes single-byte chars and `\n` line endings); the surrounding text does not claim byte-accurate offsets so this is acceptable for the illustrative example.
- `BroadcastStateExample.main` references `EventSource` and `RuleSource` classes that are not defined in that snippet; this is normal for an illustrative excerpt and is not a correctness issue.
