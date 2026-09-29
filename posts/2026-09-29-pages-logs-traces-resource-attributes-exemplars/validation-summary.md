# Validation Summary: How to Link Alerts to Logs and Traces with Resource Attributes and Exemplars

## Status
validated

## Post Type
Technical guide with shell configuration and a Prometheus alerting-rule example.

## Technologies Covered
- OpenTelemetry resource attributes and semantic conventions
- OpenTelemetry log records and distributed trace context
- OpenTelemetry metric exemplars, SDK sampling, and telemetry export
- Prometheus, PromQL, and YAML alerting rules
- Backend-specific evidence links and incident time windows
- Bash environment-variable configuration

## Sources Consulted
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- Service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- Deployment environment conventions: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
- Cloud resource conventions: https://opentelemetry.io/docs/specs/semconv/resource/cloud/
- OpenTelemetry Prometheus and OpenMetrics compatibility: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus OpenTelemetry ingestion and resource promotion: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus alerting rules and annotation templates: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- PromQL functions, including rate: https://prometheus.io/docs/prometheus/latest/querying/functions/
- PromQL aggregation and comparison operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- OpenTelemetry logs data model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Logs SDK context handling: https://opentelemetry.io/docs/specs/otel/logs/sdk/
- OpenTelemetry context propagation: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry metric exemplars: https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars
- OpenTelemetry Metrics SDK exemplar filters and reservoirs: https://opentelemetry.io/docs/specs/otel/metrics/sdk/#exemplarfilter
- Grafana exemplar link configuration: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/#exemplars
- Grafana absolute-time dashboard links and permissions: https://grafana.com/docs/grafana/latest/visualizations/dashboards/share-dashboards-panels/
- IANA example domains: https://www.iana.org/help/example-domains
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- The README required no changes. The environment-variable names, comma-separated resource attributes, and quoted shell assignment match the standard configuration format. The post correctly qualifies SDK support instead of implying universal environment-based configuration.
- The service, namespace, deployment environment, and region attributes are current names. The cloud conventions currently mark cloud.region as Development; the post appropriately advises checking implementation support and does not claim every convention is stable.
- The YAML rule structure, annotation fields, and label template match Prometheus documentation. The expression computes a five-minute average error rate per second, aggregates by service/environment/region, and selects rates greater than one. The condition must remain active for five minutes before firing. Applying rate before sum preserves counter-reset handling.
- checkout_requests_total and its outcome label are illustrative application instrumentation. The service/environment/region labels require the mapping explicitly described in the post; they are not automatic OpenTelemetry resource aliases. In a deployment with repeated service names across namespaces, the mapping or query scope must preserve namespace uniqueness.
- TraceId and SpanId are dedicated optional log fields. Capturing the resolved context at emission time and propagating it across asynchronous work are appropriate requirements for request-level correlation.
- Exemplars carry individual observations with optional trace context separately from ordinary metric dimensions. The default TraceBased filter requires a sampled parent span, but reservoir selection is still limited and downstream sampling, export loss, or retention can make a linked trace unavailable. An exemplar is not evidence that one trace explains the entire aggregate alert.
- Fixed incident windows, pre-incident context, backend permissions, and fallback searches are sound operational guidance. Grafana documentation provides concrete examples of absolute-time sharing and configurable exemplar trace links, although the post remains backend-neutral.
- All three linked OpenTelemetry documentation pages resolve to the relevant resources, and the author URL redirects to the expected GitHub profile. The runbooks.example.net URL is an intentional documentation placeholder under a reserved example domain and must be replaced with a deployment's actual runbook URL.
- No SDK, Collector, or backend version is pinned. A live end-to-end telemetry test was not performed because no running application or telemetry backend is supplied. Validation covers the examples and documented semantics, not a particular deployment's instrumentation, storage, retention, or access configuration.
