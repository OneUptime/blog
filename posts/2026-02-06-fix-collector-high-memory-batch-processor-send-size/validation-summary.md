# Validation Summary: How to Fix High Collector Memory When the Batch Processor send_batch_size Is

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector batch processor
- OpenTelemetry Collector exporter sending queue
- Collector internal telemetry metrics
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector batchprocessor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector exporterhelper package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post described `send_batch_size` as the effective size of the outgoing batch. The official batch processor documentation says `send_batch_size` is a trigger and does not enforce the outgoing batch size; `send_batch_max_size` is the hard cap. I updated the explanation and problem section to make that distinction clear.
- The post said each pipeline goroutine holds its own batch. The official batch processor documentation describes one batcher by default, and separate batchers when batching by metadata. I changed the wording to describe metadata-based batchers instead.
- The 3000-span burst example implied that any burst would necessarily be split as 2048 and 952. I clarified that this applies when a 3000-span input batch is flushed, because individual arrivals can trigger earlier at `send_batch_size`.
- The monitoring section listed `otelcol_exporter_send_latency`, which is not listed in the current official Collector internal telemetry metrics. I replaced it with `otelcol_exporter_in_flight_requests`, a current official metric useful for identifying exports stuck in flight or retry backoff.

## Review Notes
The recommended values are workload-dependent rather than official defaults. The current official defaults are `send_batch_size: 8192`, `timeout: 200ms`, and `send_batch_max_size: 0` for the batch processor, while the exporter sending queue defaults to `enabled: true`, `num_consumers: 10`, `sizer: requests`, and `queue_size: 1000` when the exporter enables the helper queue.
