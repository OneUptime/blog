# Validation Summary: How to Monitor Industrial IoT Sensor Data Ingestion Pipelines with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector OTLP HTTP exporter
- Eclipse Paho MQTT Python client
- Python requests
- MQTT-based IoT ingestion pipelines

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry metrics concepts: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlphttpexporter
- OpenTelemetry Collector configuration environment variable documentation: https://opentelemetry.io/docs/collector/configuration/
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/index.html
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Python OTLP gRPC exporters used `http://otel-collector:4317` without explicitly marking the connection as insecure. Updated both trace and metric exporters to use `endpoint="otel-collector:4317", insecure=True`, matching local Collector gRPC usage.
- The MQTT message handler read `topic_parts[2]` directly when adding metric attributes. Short or malformed topics would raise `IndexError`. Added a `sensor_type` fallback of `"unknown"`.
- Invalid JSON handling only set custom error attributes. Updated it to set the OpenTelemetry span status to `ERROR`.
- Failed cloud writes were still counted as successfully forwarded because `forward_to_cloud` did not raise on non-200 responses. Updated the code to set an error span status and call `response.raise_for_status()` before `messages_forwarded` is incremented.
- The Collector filter processor example used the older `metrics.exclude.match_type.metric_names` configuration style. Updated it to the current OTTL-based `metric_conditions` format with `error_mode: ignore`.
- The OneUptime exporter example used the OTLP gRPC exporter with an HTTP endpoint. Updated it to the current `otlp_http` exporter, JSON encoding, and the `x-oneuptime-token` header with documented `${env:ONEUPTIME_TOKEN}` substitution.
- The introduction claimed tracing started at sensor publish, but the tutorial intentionally instruments the bridge and cloud ingestion layer only. Changed the wording to trace from bridge receipt to cloud write.

## Review Notes
- The article is technically relevant and contains implementation examples, so it was reviewed as a code tutorial.
- The Python snippets were checked with `python3` AST parsing after edits; all Python code blocks are syntactically valid.
- The bridge example is still an excerpt rather than a complete runnable MQTT subscriber because it does not include client connection, subscription, and loop setup. That is acceptable for this post's scope, but a future revision could make the example fully runnable.
