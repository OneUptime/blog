# Validation Summary: How to Configure Attribute Cardinality Limits to Prevent Metric Cost Explosions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Metrics API and SDK
- OpenTelemetry Python SDK Views
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector cumulativetodelta processor
- OpenTelemetry semantic conventions
- Prometheus alerting rules

## Sources Consulted
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Python SDK View documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Python MeterProvider documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL function documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry database metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/

## Issues Found
- The post referenced `OTEL_METRIC_EXPORT_ATTRIBUTE_COUNT_LIMIT`, which is not a portable OpenTelemetry SDK environment variable. Replaced it with the documented general and span attribute limit variables, and clarified that metric attributes are currently exempt from the common attribute limit rules.
- The wildcard Python View used `attribute_keys=None` while claiming it limited unmatched metrics to five attributes. In the Python SDK, `None` does not apply a five-attribute limit, and a wildcard View can also create duplicate streams for specifically matched instruments. Replaced that block with a note that unmatched instruments use default behavior.
- The Collector section claimed the `filter` processor drops data points that exceed cardinality thresholds, but the example did not configure a filter and the portable transform example does not enforce true time-series cardinality thresholds. Reworded the claim and noted that `cardinalityguardianprocessor` exists in some distributions but is still development status.
- The Collector transform snippet said it capped attribute counts but did not actually do so. Added the OTTL `limit(attributes, 10, [...])` statement and `error_mode: ignore`.
- The cumulativetodelta explanation implied it reduces cardinality. Clarified that it can support downstream reaggregation but does not reduce cardinality by itself.
- Several metric semantic convention attributes used older names (`http.method`, `http.status_code`, `db.operation`, `db.name`, `db.system`). Updated them to current names such as `http.request.method`, `http.response.status_code`, `db.operation.name`, `db.namespace`, and `db.system.name`.

## Review Notes
The Prometheus alert examples are syntactically plausible, but in a real deployment they may need scoping to specific jobs or metric namespaces to avoid expensive broad queries over all active series.
