# Validation Summary: How to Add OpenTelemetry Observability to CI/CD Pipelines

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector span metrics connector
- OTLP gRPC and HTTP receivers/exporters
- Jaeger
- Prometheus and Grafana
- GitHub Actions
- Jenkins Pipeline and Jenkins OpenTelemetry plugin
- `otel-cli`
- OpenTelemetry JavaScript SDK for Node.js
- Kubernetes and AWS ECS deployment metadata examples

## Sources Consulted
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector span metrics connector docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Prometheus exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry semantic convention registry for deployment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- `@opentelemetry/semantic-conventions` npm package metadata for current exported constants: https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- `otel-cli` official repository and command help: https://github.com/equinix-labs/otel-cli
- `inception-health/otel-export-trace-action` README and action metadata: https://github.com/inception-health/otel-export-trace-action
- `actions/checkout` official repository/releases: https://github.com/actions/checkout
- `actions/setup-node` official repository/releases: https://github.com/actions/setup-node
- Jenkins OpenTelemetry plugin page: https://plugins.jenkins.io/opentelemetry/
- Jenkins OpenTelemetry plugin job traces docs: https://github.com/jenkinsci/opentelemetry-plugin/blob/main/docs/job-traces.md

## Issues Found
- The Docker Compose example did not publish the Prometheus exporter port configured in the Collector (`8889`). Added `8889:8889` and clarified that `8888` is Collector internal telemetry.
- The Jaeger port comment/configuration implied `14250` was the OTLP gRPC endpoint. Updated the example to expose Jaeger's OTLP gRPC port `4317` for consistency with `COLLECTOR_OTLP_ENABLED=true` and the Collector OTLP exporter endpoint.
- The GitHub Actions `otel-cli` install URL used a stale asset name that returns 404 for the current release. Updated it to the current `otel-cli_0.4.5_linux_amd64.tar.gz` release asset pattern.
- The GitHub Actions examples used invalid `otel-cli` commands or flags, including `otel-cli version`, `--tp-carrier-file`, `otel-cli span-id`, and `otel-cli span event` without a background span socket. Replaced them with documented `otel-cli --help`, `--force-trace-id`, `--force-span-id`, valid `TRACEPARENT` propagation, and standalone status spans.
- The GitHub Action example used the wrong input name `serviceName`; the action defines `otelServiceName`. Fixed the input and moved the export action into a dependent `if: always()` job so it exports completed workflow data.
- Several examples used deprecated `deployment.environment`. Updated them to the current semantic convention `deployment.environment.name`, and updated deployment status examples to `succeeded|failed`.
- The span metrics example used the deprecated processor-style `spanmetrics` configuration with `metrics_exporter`. Reworked it to use the current `span_metrics` connector wiring and updated Grafana queries to use current Prometheus-normalized metric names such as `traces_span_metrics_duration_milliseconds_bucket` and `traces_span_metrics_calls_total`.
- The span metrics connector config duplicated the default `service.name` dimension. Removed the duplicate after validating with `otelcol-contrib`.
- The Node.js example used `new Resource(...)`, which is removed in OpenTelemetry JS SDK 2.x. Updated it to `resourceFromAttributes(...)` and current semantic convention constants.
- The Jenkins manual SDK example referenced helper functions that were not provided in the post. Removed those calls and kept the sample aligned with the shown `initializeOpenTelemetry` and `withSpan` helpers.
- The Jenkins shared-library snippet imported the deprecated Java `ResourceAttributes` semconv class. Replaced it with explicit `AttributeKey.stringKey(...)` resource keys.
- The shell best-practice example used `otel-cli` status-code casing inconsistent with current help output. Updated `Ok`/`Error` to `ok`/`error`.

## Review Notes
- Verified both Collector configuration snippets with `otelcol-contrib` v0.154.0 `validate`.
- Verified the Node.js instrumentation snippet with `node --check`.
- Verified the deployment shell snippet with `bash -n`.
- The GitHub Actions and Jenkins pipeline snippets remain illustrative and depend on project-specific scripts, credentials, plugins, and deployment tools being present.
