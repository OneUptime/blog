# Validation Summary: How to Turn Slow Database Queries into Actionable Metrics with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and metrics
- OpenTelemetry Python SDK
- OpenTelemetry Python SQLAlchemy instrumentation
- OpenTelemetry JavaScript SDK
- OpenTelemetry PostgreSQL instrumentation for Node.js
- OpenTelemetry Collector
- Span metrics connector
- SQL database semantic conventions

## Sources Consulted
- OpenTelemetry SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry database client metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- @opentelemetry/instrumentation-pg package documentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-pg

## Issues Found
- The post used only the older database semantic attributes `db.statement` and `db.system`. I updated the explanation and examples to mention the stable `db.query.text` and `db.system.name` attributes while noting that existing instrumentations may still emit the older attributes by default during the semantic convention migration.
- The Python histogram example used `db.query.duration` with millisecond values. I updated it to use the stable `db.client.operation.duration` histogram with seconds as the unit and converted milliseconds before recording.
- The Collector example declared `filter/db` but did not use it, so database spans were not actually isolated for span-derived metrics. I split the trace flow into a raw traces pipeline and a database metrics trace pipeline that applies the filter before exporting to the connector.
- The Collector example used the deprecated `spanmetrics` component type and deprecated `dimensions_cache_size` setting. I updated the connector type to `span_metrics` and replaced the setting with `aggregation_cardinality_limit`.
- The span metrics histogram bucket values were plain numbers even though the connector expects duration values. I added explicit duration units such as `5ms`, `1s`, and `10s`.
- The article implied metrics could always link directly to an exact trace because spans and metrics share attributes. I clarified that direct click-through requires exemplar support, while shared attributes can be used to find matching traces.
- The Node.js example created a histogram but never recorded query durations or slow-query counts. I added a small `pg` query wrapper that records both metrics.
- The Node.js example loaded `pg` before registering `PgInstrumentation`, which can prevent auto-instrumentation from patching the module. I moved the `pg` import until after `registerInstrumentations`.
- The Node.js `responseHook` accessed `responseInfo.data.rowCount` without guarding `data`. I changed it to optional chaining and used the current `db.response.returned_rows` attribute name.

## Review Notes
The post is technically valid after the fixes. Some custom metric and attribute names such as `db.query.name`, `db.query.slow`, and `db.query.slow.count` are not standard OpenTelemetry semantic convention names, but they are acceptable as custom low-cardinality attributes and metrics when teams define them consistently.
