# Validation Summary: How to Troubleshoot Collector Garbage Collection Pauses Causing Intermittent

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector OTLP exporter
- OpenTelemetry Collector batch processor
- OpenTelemetry Collector persistent sending queue and file storage extension
- OpenTelemetry Collector pprof extension
- Go runtime garbage collection
- Prometheus alerting

## Sources Consulted
- Go runtime environment variables documentation: https://pkg.go.dev/runtime#hdr-Environment_Variables
- Go runtime/debug memory limit documentation: https://pkg.go.dev/runtime/debug#SetMemoryLimit
- Go net/http/pprof documentation: https://pkg.go.dev/net/http/pprof
- OpenTelemetry Collector exporterhelper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector pprof extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/pprofextension/README.md
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Go runtime metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/go-metrics/

## Issues Found
- The post described the middle value in a Go `gctrace` line as the GC pause time. Go's current `gctrace` format reports three clock values for GC phases; the first and third values are the stop-the-world parts, while the middle value is concurrent GC work. Updated the example and explanation.
- The post said GC pauses "freeze the Collector" long enough to time out exports. Go GC is mostly concurrent, so this was changed to describe stop-the-world pauses and GC CPU pressure delaying export attempts.
- The `GOMEMLIMIT` explanation said that without it Go's GC simply runs when the heap doubles. Updated this to the documented `GOGC=100` target behavior and clarified that `GOMEMLIMIT` is a soft runtime memory limit.
- The batch processor discussion implied each batch is a single large allocation. Updated this to say pending batches hold more data in memory until exported.
- The persistent queue section implied timed-out exports are always lost unless persistent queueing is enabled. Collector exporters support retry and sending queues, so this was changed to explain loss conditions when retries are disabled or exhausted, queues fill, or storage limits are hit.
- The monitoring section claimed the Collector exposes `go_gc_duration_seconds` and `go_memstats_*` metrics through its own telemetry. Current Collector internal telemetry documents `otelcol_process_*` runtime/process metrics instead. Replaced the metric list and made GC pause alerting conditional on a telemetry setup that exports Go runtime GC pause metrics.
- The pprof section called `/debug/pprof/heap?debug=1` a GC stats query. The Go pprof docs define it as a heap profile endpoint, so the text was corrected.

## Review Notes
- The Collector configuration field names used in the snippets (`timeout`, `retry_on_failure`, `sending_queue.storage`, `queue_size`, `send_batch_size`, `send_batch_max_size`, and pprof `endpoint`) match current Collector documentation.
- The Prometheus alert example assumes the OpenTelemetry Go runtime GC pause histogram is exported with Prometheus-style metric naming. Deployments that preserve OpenTelemetry dotted metric names may need to adjust the metric name in PromQL.
