# Validation Summary: How to Detect and Alert on Slow SQL Queries Using OpenTelemetry Span Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry span metrics connector
- OpenTelemetry Python SQLAlchemy instrumentation
- OTLP exporters
- Prometheus alerting rules and PromQL
- Tail-based sampling
- SQL database tracing

## Sources Consulted
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector connector documentation: https://opentelemetry.io/docs/collector/extend/custom-component/connector/
- OpenTelemetry Collector filter processor / OTTL documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Python SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- Jaeger service performance monitoring spanmetrics documentation: https://www.jaegertracing.io/docs/2.0/spm/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The diagram and text referred to a span metrics processor. Updated this to the span metrics connector, which is the current Collector architecture for generating metrics from traces.
- The Collector configuration used the deprecated `spanmetrics` component name. Updated it to `span_metrics`, the current preferred connector type.
- The connector example used deprecated `dimensions_cache_size`. Replaced it with `aggregation_cardinality_limit` and updated the production note accordingly.
- The DB span filter processor was incomplete and was not attached to any pipeline. Replaced it with an OTTL filter and added a dedicated filtered traces pipeline feeding the `span_metrics` connector, while keeping the normal traces pipeline exporting full traces.
- The generated metric names and PromQL examples used short metric names such as `duration_milliseconds_bucket`. Updated them to the Prometheus-normalized span metrics connector names, such as `traces_span_metrics_duration_milliseconds_bucket`.
- The post stated that custom attributes set on a parent application span automatically become metric labels for child SQLAlchemy database spans. Clarified that those attributes help trace debugging, but must be added to or copied onto the database span and configured as dimensions before they are available as span-metric labels.
- The Python instrumentation text implied one fixed set of DB semantic attribute names. Updated it to mention both legacy and current database semantic-convention attribute names because emitted attributes depend on instrumentation version and semantic-convention mode.
- The sampling section stated sampling affects span-derived metrics without qualification. Clarified that this is true when sampling happens before the span metrics connector.

## Review Notes
The post is technically relevant and useful. The examples now align with the current span metrics connector documentation, but real deployments should still verify emitted DB attribute names because OpenTelemetry database semantic conventions are in a compatibility transition across instrumentation versions.
