# Validation Summary: How to Calculate Error Budgets from OpenTelemetry Span Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python metrics API
- OpenTelemetry Collector spanmetrics connector
- Prometheus and PromQL
- Prometheus alerting rules
- SLO error budgets and burn rates

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Python metrics API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The post said OpenTelemetry span metrics give everything needed "without any additional tooling" and that the OpenTelemetry SDK can generate metrics using the Collector spanmetrics connector. The spanmetrics connector is a Collector component, not an SDK feature, so the wording was changed to say span data must be converted into metrics and that the Collector connector can generate request counts split by `status.code`.
- The PromQL section implied the queries applied generically to OpenTelemetry spanmetrics output, but the query metric names match the custom counters in the Python example. The wording was changed to specify that these queries apply to the custom metrics shown above.
- The error budget remaining PromQL returned a fraction while the comment described remaining budget. It was changed to return a clamped percentage using Prometheus `clamp_min`.
- The alerting example was described as multi-window burn rate alerting but only checked one window per alert. It was updated to use the Google SRE Workbook's 1h/5m 14.4x and 6h/30m 6x multi-window patterns.
- The alert PromQL filtered on `{service="my-api"}`, which did not match the normalized form of the `service.name` attribute used in the Python example. The selector was updated to `{service_name="my-api"}`.

## Review Notes
The Python examples are syntactically valid and use current OpenTelemetry Python metrics APIs. In a production implementation, the in-memory counters used for the gauge should be protected for concurrency and scoped to the same SLO window as the SLO policy.
