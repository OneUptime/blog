# Validation Summary: How to Configure the Datadog Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Datadog receiver
- StatsD receiver and DogStatsD
- Datadog APM tracing libraries
- Datadog exporter
- OpenTelemetry Collector processors and exporters
- OneUptime OTLP ingestion
- Python, Java, and Node.js Datadog client configuration

## Sources Consulted
- OpenTelemetry Collector Contrib Datadog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/datadogreceiver/README.md
- OpenTelemetry Collector Contrib StatsD receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/statsdreceiver/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Datadog Java tracer configuration documentation: https://docs.datadoghq.com/tracing/trace_collection/library_config/java/
- Datadog DogStatsD documentation: https://docs.datadoghq.com/developers/dogstatsd/
- Datadog trace Agent API documentation: https://docs.datadoghq.com/tracing/guide/send_traces_to_agent_by_api/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- Corrected the main architectural claim that the Datadog receiver directly handles DogStatsD. The current Collector uses the separate `statsd` receiver for StatsD and DogStatsD metrics, while the `datadog` receiver handles Datadog trace/intake APIs.
- Removed undocumented `read_metadata_tags` and nested `datadog.statsd` configuration examples.
- Replaced nonexistent `parse_dogstatsd_tags` with the documented StatsD receiver behavior: key:value DogStatsD tags are parsed by default, and `enable_simple_tags` enables tags without values.
- Replaced unsupported `observer_type: "distribution"` values with supported StatsD receiver observer types.
- Updated OneUptime `otlphttp` snippets to include `encoding: json` and `Content-Type: application/json`, matching OneUptime's current collector example.
- Replaced deprecated/ignored `service.telemetry.metrics.address` examples with the current `metrics.readers.pull.exporter.prometheus` configuration.
- Replaced legacy filter processor examples with current OTTL `trace_conditions` and `metric_conditions` syntax.
- Fixed transform processor examples to use current OTTL paths such as `span.name`, `span.attributes`, and `span.kind`.
- Added missing `batch` processor definitions where snippets referenced `batch`.
- Fixed invalid batch processor sizing by adding explicit `send_batch_size` values smaller than `send_batch_max_size`.
- Corrected the Java tracer port system property from `dd.agent.port` to `dd.trace.agent.port`.
- Fixed the Node.js example so the snippet is syntactically valid and does not redeclare the same `const` binding.
- Added a scaling caveat that the StatsD receiver is intended for agent-mode deployment rather than naive horizontal scaling behind a load balancer.

## Review Notes
- Complete YAML snippets extracted from the post were validated with `otelcol-contrib` v0.153.0 using `otelcol-contrib validate`.
- Python snippets were checked with Python AST parsing, and the JavaScript snippet was checked with `node --check`.
- The post is not pinned to a specific Collector version; future Collector releases may require another schema review.
