# Validation Summary: How to Send OpenTelemetry Traces to Sentry via the Sentry Exporter

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib Sentry exporter
- Sentry tracing and OTLP ingestion
- OpenTelemetry Python tracing API
- OTLP gRPC exporter
- Tail sampling processor
- Jaeger / OTLP exporter

## Sources Consulted
- OpenTelemetry Collector contrib Sentry exporter README, v0.153.0: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/exporter/sentryexporter
- OpenTelemetry Collector contrib Sentry exporter config and implementation, v0.153.0: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/exporter/sentryexporter
- OpenTelemetry Collector contrib Sentry exporter spec: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/exporter/sentryexporter/docs/spec.md
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/processor/tailsamplingprocessor
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- Sentry API authentication documentation: https://docs.sentry.io/hosted/api/auth/
- Sentry API permissions and scopes documentation: https://docs.sentry.io/api/permissions/

## Issues Found
- The post described the current Sentry exporter as a DSN-based exporter. The current OpenTelemetry Collector contrib Sentry exporter uses `url`, `org_slug`, and `auth_token`, routes by a resource attribute such as `service.name`, and discovers project OTLP endpoints through the Sentry Management API. I replaced the DSN setup and config examples with the current API-token and routing configuration.
- The post claimed the exporter converts OpenTelemetry spans into Sentry transactions, maps span attributes to Sentry tags, and links error spans to Sentry issues. Current exporter documentation says it forwards OTLP traces and logs without transformation. I changed those statements to describe OTLP forwarding and project routing.
- The post stated that `dsn` is the only required setting. I corrected this to `url`, `org_slug`, and `auth_token`.
- The error handling example used `span.set_status(StatusCode.ERROR, str(e))`, which does not match the current OpenTelemetry Python documentation pattern. I changed it to import `Status` and call `span.set_status(Status(StatusCode.ERROR, str(e)))`.
- The post claimed `record_exception` is converted by the exporter into a proper Sentry exception with full traceback. I changed this to the accurate OpenTelemetry behavior: `record_exception` adds exception details as a span event, and Sentry SDK/OpenTelemetry integration settings are needed when application error events must stay connected to traces.
- Troubleshooting was DSN-oriented. I updated it to mention auth token scopes and the fact that resources missing `service.name` are dropped by the exporter when using default routing.

## Review Notes
The Sentry exporter is listed as alpha for traces and logs in the contrib distribution as of OpenTelemetry Collector contrib v0.153.0. The article now targets the current exporter behavior rather than the removed legacy DSN-only mode. The tail sampling example is valid, but production deployments using tail sampling must ensure all spans for the same trace reach the same Collector instance.
