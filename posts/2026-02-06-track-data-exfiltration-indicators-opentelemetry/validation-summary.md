# Validation Summary: How to Track Data Exfiltration Indicators with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python metrics and traces
- Flask request handling and WSGI middleware
- Prometheus alerting rules and PromQL
- Python datetime and timezone handling with pytz

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Flask request context documentation: https://flask.palletsprojects.com/en/stable/reqcontext/
- PEP 3333 WSGI specification: https://peps.python.org/pep-3333/

## Issues Found
- The `OffHoursExportAccess` alert used `rate(security_off_hours_access_count_total[30m]) > 5`, which compares a per-second rate against 5. Changed it to `increase(security_off_hours_access_count_total[30m]) > 5` so the alert matches the stated intent of counting off-hours events in the 30-minute window.
- Metric attributes used `user.id` while the PromQL alerts grouped by `user_id`. Changed metric attribute keys to `user_id` for the custom security counters and histogram so the alert labels align without depending on backend-specific label translation behavior.
- The WSGI middleware iterated over the wrapped response but did not close the returned iterable. Added a `finally` block that calls `response.close()` when available, following the WSGI iterable cleanup requirement.
- Removed unused imports from the Python examples.

## Review Notes
The examples assume the Flask app is already configured with an OpenTelemetry SDK/exporter and request tracing instrumentation. The custom `security.*` metric names are valid OpenTelemetry instrument names and map to Prometheus-style names under the default OpenTelemetry Prometheus translation strategy, but deployments using non-default translation settings may need to adjust alert metric names.
