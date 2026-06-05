# Validation Summary: How to Create an OpenTelemetry Standards Document Defining Span Naming,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry resource attributes
- OpenTelemetry span naming and span attributes
- OpenTelemetry metrics
- OpenTelemetry Collector transform processor
- OpenTelemetry Weaver
- Python OpenTelemetry span attribute API
- YAML configuration

## Sources Consulted
- OpenTelemetry semantic conventions 1.41.0: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry resources concept documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry general naming guidelines for attributes and metrics: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector telemetry transformation guide: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The introduction used `http.status` and `http.status_code` as the inconsistent status-code examples. Updated this to `http.status_code` and `http.response.status_code` because current HTTP semantic conventions use `http.response.status_code`.
- The resource attribute example used `deployment.environment`. Updated it to `deployment.environment.name`, which is the current OpenTelemetry semantic convention attribute for deployment environment name.
- HTTP span naming examples included an `HTTP` prefix. Updated server and client span examples to follow the current convention of `{method} {target}`, such as `GET /api/v1/orders/{id}`.
- The HTTP client span pattern used `<host>/<route>`. Updated it to `<url.template>` because current HTTP client conventions recommend a low-cardinality target such as `url.template` when available.
- The database span naming example used older-style placeholders such as `db.system`, `db.operation`, and `db.sql.table`. Updated it to the current `{db.operation.name} {target}` pattern and example.
- The messaging span naming example included `messaging.system` and used `publish` as the operation. Updated it to `{messaging.operation.name} {destination}` with `send order.events`, matching current messaging span conventions.
- The metric example placed the unit in the metric name with `orders.checkout.duration_ms` and used `milliseconds` as the unit string. Updated the guidance to put units in the instrument unit and description, renamed the metric to `order.checkout.duration`, and changed the unit to `ms`.
- The metric namespace examples used plural `orders`. Updated them to singular `order` to align with OpenTelemetry metric namespace naming guidance.

## Review Notes
The transform processor example is syntactically consistent with OTTL span-context examples. The article remains organization-policy oriented, so some choices such as making specific resource attributes required are acceptable as internal standards even when OpenTelemetry itself treats some of them as optional or recommended.
