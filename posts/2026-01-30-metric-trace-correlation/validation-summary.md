# Validation Summary: How to Create Metric-Trace Correlation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry metrics, traces, exemplars, and OTLP exporters
- Prometheus exemplar storage
- Grafana exemplars and trace links
- TypeScript
- Node.js
- Pino logging

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript package API metadata from npm for `@opentelemetry/sdk-node`, `@opentelemetry/sdk-metrics`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `@opentelemetry/exporter-prometheus`, `@opentelemetry/exporter-trace-otlp-http`, and `@opentelemetry/exporter-metrics-otlp-http`
- Prometheus feature flags documentation: https://prometheus.io/docs/prometheus/latest/feature_flags/
- Grafana exemplars documentation: https://grafana.com/docs/grafana/latest/fundamentals/exemplars/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/

## Issues Found
- The install command used `@opentelemetry/exporter-otlp-http`, but the code imports `@opentelemetry/exporter-trace-otlp-http` and `@opentelemetry/exporter-metrics-otlp-http`. Updated the command to install the packages used by the examples.
- The OpenTelemetry resource examples used `new Resource(...)` from `@opentelemetry/resources`, which is not exported as a constructible class in current OpenTelemetry JS packages. Updated examples to use `resourceFromAttributes(...)`.
- The semantic convention examples used `SemanticResourceAttributes` from the package root. Updated them to current `ATTR_*` constants, including `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The Prometheus exporter section claimed the OpenTelemetry JavaScript `PrometheusExporter` automatically emits exemplars in the scrape response. Current package code serializes metrics but not exemplars. Added a note that JavaScript users should use an OTLP/Collector or backend path that explicitly supports exemplars, and adjusted the example output.
- The Prometheus scrape config placed `enable_features` under a scrape job, which is not valid Prometheus configuration. Updated the text to state that Prometheus must be started with `--enable-feature=exemplar-storage`, while `storage.exemplars.max_exemplars` configures storage size.

## Review Notes
The conceptual explanation of metric-trace correlation, exemplars, cardinality management, and Grafana linking is broadly accurate. OpenTelemetry JavaScript exemplar support remains version/exporter dependent, so production users should verify exemplar presence in exported payloads and in their backend before relying on click-through workflows.
