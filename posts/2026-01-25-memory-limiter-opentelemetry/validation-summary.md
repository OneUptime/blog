# Validation Summary: How to Configure Memory Limiter in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory limiter processor
- OpenTelemetry Collector internal telemetry
- Prometheus metrics and alerts
- Kubernetes resource limits
- OpenTelemetry Collector exporter queues
- OpenTelemetry Collector file storage extension
- OpenTelemetry Transform Processor / OTTL

## Sources Consulted
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector memory limiter processor generated telemetry docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/documentation.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP receiver config reference: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/config.md
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector Contrib Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector Contrib file storage package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage

## Issues Found
- The post used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated internal telemetry examples to use `service.telemetry.metrics.readers` with the Prometheus pull exporter.
- The post recommended `otelcol_processor_refused_spans` and `otelcol_processor_accepted_spans`, but the memory limiter processor telemetry docs mark these processor metrics as deprecated since v0.110.0. Updated examples to use `otelcol_receiver_refused_spans` and `otelcol_receiver_accepted_spans`.
- The Prometheus alert used the deprecated `otelcol_processor_refused_spans` metric. Updated it to `otelcol_receiver_refused_spans`.
- The memory limiter flow and comments said the processor starts "dropping" data. The official behavior is that it refuses data by returning non-permanent errors and applies backpressure; data loss depends on whether upstream components retry. Updated the wording to "refuse data."
- The queue tuning example said the default `sending_queue.queue_size` was 5000, but current exporter helper documentation lists the default as 1000. Updated the comment.
- The transform processor example used `truncate_all(attributes, 1024)` in a span context. Updated it to the documented `truncate_all(span.attributes, 1024)` path.
- The persistent queue recommendation did not mention that `file_storage` is available in Collector distributions that include the file storage extension. Clarified that scope.

## Review Notes
The post remains technically relevant and has been validated after the corrections above. I could not run `otelcol validate` locally because no `otelcol` or `otelcol-contrib` binary is installed in the environment, so validation was performed against official component documentation.
