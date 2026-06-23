# Validation Summary: How to increase the size of the sending queue in OpenTelemetry Collector?

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector exporterhelper (`sending_queue` configuration)
- OTLP HTTP exporter (`otlphttp`)
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector exporterhelper README — https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- exporterhelper Go package docs — https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- exporterhelper queue_sender source — https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/internal/queue_sender.go

## Issues Found
- **Incorrect default value for `num_consumers`.** The post stated "the number of consumers is set to 1" by default. The actual exporterhelper default is **10** (confirmed in the exporterhelper README and source). Fixed the sentence on line 13 to read "the number of consumers is set to 10." The in-code comment block did not assert a specific default for `num_consumers`, so no change was needed there.

## Review Notes
- The `queue_size` default of 1000 is correct.
- The description of `queue_size` as the "Maximum number of batches to hold in the queue" is accurate: with the default `sizer: requests`, the queue measures size in batches/requests (each request being a batch of spans/metrics/logs). Newer Collector versions also support `sizer: items` and `sizer: bytes`, but the post's batch-based explanation remains correct for the default behavior.
- `enabled: true` as the default is correct.
- The `headers: {"Content-Type": "application/json"}` example is illustrative. Note that the `otlphttp` exporter defaults to protobuf encoding (`application/x-protobuf`) and manages its own Content-Type; the JSON value here is only an example header placeholder and not strictly required. This was left intact as it is presented as an example and does not constitute a factual error in the queue-sizing guidance that is the subject of the post.
- The configuration syntax (`exporters` → `otlphttp` → `sending_queue` with `enabled`, `num_consumers`, `queue_size`) is valid and matches the current exporterhelper schema.
