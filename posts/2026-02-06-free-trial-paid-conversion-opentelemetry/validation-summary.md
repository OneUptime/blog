# Validation Summary: How to Trace SaaS Free-Trial to Paid Conversion Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry Python tracing API
- Python datetime handling
- SaaS trial conversion and business metrics

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry metrics concepts documentation: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry metric semantic conventions for units: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- UCUM specification: https://ucum.org/ucum
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- Replaced `datetime.utcnow()` with `datetime.now(timezone.utc)` and imported `timezone`, because `datetime.utcnow()` is deprecated in Python 3.12+ and returns a timezone-naive datetime.
- Captured a single `now` value when creating a trial record so `starts_at` and `expires_at` are based on the same timestamp.
- Changed the `trial.days_to_convert` histogram unit from `days` to `d`, because OpenTelemetry recommends UCUM units and UCUM defines `d` as the day unit.

## Review Notes
The OpenTelemetry metric and trace APIs used in the examples are current: `metrics.get_meter`, `trace.get_tracer`, `create_counter`, `create_histogram`, `Counter.add`, `Histogram.record`, `start_as_current_span`, and `span.set_attribute` match the documented Python APIs. The application-specific helpers such as `create_trial_record`, `get_active_trial`, and `create_subscription` are placeholders and were treated as omitted business logic.
