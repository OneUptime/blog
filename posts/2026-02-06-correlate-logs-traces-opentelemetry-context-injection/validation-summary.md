# Validation Summary: How to Correlate Logs with Traces Automatically

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry Python logging instrumentation
- OpenTelemetry Java agent
- Log4j2 MDC/context data
- OpenTelemetry Collector
- OTLP

## Sources Consulted
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Java agent configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java logger MDC auto-instrumentation documentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/logger-mdc-instrumentation.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The Python install command did not include the OTLP gRPC exporter package required by `opentelemetry.exporter.otlp.proto.grpc.trace_exporter.OTLPSpanExporter`. Added `opentelemetry-exporter-otlp-proto-grpc`.
- The Python tracing example imported and used `BatchSpanExporter`, which is not the current SDK span processor class used for batching spans. Replaced it with `BatchSpanProcessor`.
- The custom Python logging format example used `logging.basicConfig()` after the earlier `LoggingInstrumentor().instrument(set_logging_format=True)` example. Because `basicConfig()` only affects the logger once, this could be ineffective. Changed the example to pass `logging_format` and `log_level` directly to `LoggingInstrumentor().instrument()`.
- The Java agent command targeted `http://collector:4317` but did not set the OTLP protocol. OpenTelemetry Java agent 2.x defaults to `http/protobuf`, while port `4317` is the OTLP gRPC port in the collector config. Added `-Dotel.exporter.otlp.protocol=grpc`.

## Review Notes
The collector configuration is structurally valid for OTLP logs and traces, but production deployments should confirm backend-specific endpoint, TLS, authentication, and log-correlation field-name requirements.
