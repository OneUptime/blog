# Validation Summary: How to Build an Internal Observability Marketplace with Pre-Built OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Python Flask and requests instrumentation
- OpenTelemetry Prometheus exporter compatibility
- Prometheus metrics, PromQL, and alerting rules
- YAML
- JSON
- Python
- Jinja templates

## Sources Consulted
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry requests instrumentation package documentation: https://pypi.org/project/opentelemetry-instrumentation-requests/
- Jinja documentation: https://jinja.palletsprojects.com/en/stable/
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation
- Python json module documentation: https://docs.python.org/3/library/json.html

## Issues Found
- The manifest described Prometheus-style metric names as "from OTel semantic conventions." Current OpenTelemetry HTTP semantic convention names use dotted names such as `http.server.request.duration`; Prometheus-compatible exporters may translate these to names such as `http_server_request_duration_seconds`. Updated the wording to clarify that the listed names are exposed by a Prometheus-compatible OTel pipeline.
- The PromQL examples filtered metrics with a `service_name` label. OpenTelemetry Prometheus compatibility specifies that the Collector's Prometheus exporters derive the Prometheus `job` label from `service.name` and `service.namespace`, while resource attributes are not added as metric labels by default. Updated dashboard and alert PromQL examples to filter on `job`.
- The installer example included `required: true` parameters in the manifest but did not enforce them. Added required-parameter validation so missing required values fail before rendering templates.

## Review Notes
- The PromQL examples assume the default OpenTelemetry-to-Prometheus translation strategy that escapes dotted OTel metric and attribute names and appends unit/type suffixes. Pipelines configured with `NoTranslation` or custom resource label copying would need corresponding package templates.
- The Python installer snippet is illustrative and still depends on application-specific `provision_dashboard` and `provision_alert_rules` functions.
