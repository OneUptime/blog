# Validation Summary: How to Build a Platform Engineering Scorecard That Tracks OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Collector spanmetrics connector
- Prometheus HTTP API and PromQL
- Python dataclasses and type annotations
- Flask JSON API routes
- YAML configuration

## Sources Consulted
- OpenTelemetry Resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry Service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry Deployment attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry semantic convention naming guidelines: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Flask API documentation for `Flask` and `jsonify`: https://flask.palletsprojects.com/en/stable/api/
- Python syntax validation with `ast.parse` against all Python code blocks in the post.

## Issues Found
- The post used the deprecated OpenTelemetry resource attribute `deployment.environment`. Updated the required attribute list to `deployment.environment.name`, which is the current semantic convention replacement.
- The SDK currency check used a non-standard `telemetry.sdk.wrapper` resource attribute. Updated the example to use `telemetry.distro.version`, which is the documented attribute for SDK distributions and auto-instrumentation distributions.
- The trace-adoption PromQL example queried `traces_spanmetricsconnector_duration_seconds_count`, which does not match the current spanmetrics connector metric naming. Updated it to query `traces_span_metrics_calls_total`, the Prometheus-normalized spanmetrics calls counter.
- The trace-adoption check said "at least 1 span per minute" but treated any positive hourly rate as passing. Updated the threshold to require a rate of at least `1.0 / 60.0` spans per second.
- The `aggregator.py` snippet referenced `ServiceScorecard` in a type annotation without importing it. Added `from scorecard.engine import ServiceScorecard`.
- The Flask API snippet called `get_all_services_from_catalog()` without importing it. Added `from scorecard.catalog import get_all_services_from_catalog`.
- The team scorecard endpoint divided by zero when the service catalog returned no teams. Added an empty-summary guard that returns `0.0` for `org_average`.

## Review Notes
The backend trace search API is intentionally shown as an internal example, so its query syntax and JSON shape are backend-specific rather than part of the OpenTelemetry specification. The Python examples are still illustrative and assume the omitted `compute_scorecard` and catalog implementation exist in the surrounding scorecard package.
