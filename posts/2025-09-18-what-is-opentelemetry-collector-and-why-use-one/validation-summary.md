# Validation Summary: OpenTelemetry Collector: What It Is, When You Need It, and When You Don’t

## Status
validated

## Post Type
Guide / conceptual explainer with a production configuration example

## Technologies Covered
- OpenTelemetry Collector (receivers, processors, exporters, extensions, pipelines)
- OTLP (gRPC port 4317, HTTP port 4318)
- `batch`, `memory_limiter`, `attributes`, and `tail_sampling` processors
- `otlphttp` exporter
- Telemetry signals: traces, metrics, logs, profiles
- Tail-based sampling (status_code and latency policies)

## Sources Consulted
- OpenTelemetry Collector Configuration docs — https://opentelemetry.io/docs/collector/configuration/
- Batch Processor README — https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- Tail Sampling Processor README — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Attributes Processor (opentelemetry-collector-contrib) documentation
- Memory Limiter Processor documentation

## Issues Found
- **Incorrect processor order in the traces pipeline.** The original config used `processors: [memory_limiter, batch, tail_sampling, attributes/redact]`, placing the `batch` processor *before* `tail_sampling`. The official OpenTelemetry documentation explicitly warns against this: batching before the tail sampling (or group-by-trace) processor can split spans belonging to the same trace across separate batches, which skews sampling decisions. The recommended order is to batch *after* any sampling/data-drop processors. Fixed to `processors: [memory_limiter, attributes/redact, tail_sampling, batch]` and added a short inline comment explaining why batch must run after tail_sampling.

## Review Notes
- The `tail_sampling` policy syntax (`status_code` with `status_codes: [ERROR]`, and `latency` with `threshold_ms: 500`) is correct and matches the current contrib processor documentation.
- The `memory_limiter` (`limit_mib`, `spike_limit_mib`, `check_interval`), `batch` (`send_batch_max_size`, `timeout`), and `attributes` (`actions` with `action: delete`) field names are all valid and current.
- The `otlphttp` exporter usage is correct, including the note that signal-specific paths (`/v1/traces`, `/v1/metrics`, `/v1/logs`) are appended to the base `endpoint` automatically.
- OTLP default ports (4317 gRPC, 4318 HTTP) are accurate.
- Listing `profiles` as a signal with "more coming" is accurate — profiling is an emerging OpenTelemetry signal still under development.
- Minor (not changed, not an error): in the metrics/logs pipelines `batch` is not placed last, but since those pipelines perform no sampling there is no correctness impact; left as-is to avoid stylistic edits.
- `memory_limiter` is conventionally documented as the first processor in a pipeline, which the post follows correctly across all three pipelines.
