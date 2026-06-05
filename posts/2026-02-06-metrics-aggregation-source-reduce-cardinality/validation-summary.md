# Validation Summary: Use OpenTelemetry Metrics Aggregation at the Source to Reduce Cardinality Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Metrics SDK
- OpenTelemetry Python SDK and OTLP metric exporter
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector groupbyattrs processor
- OpenTelemetry semantic conventions
- PromQL

## Sources Consulted
- OpenTelemetry Python `opentelemetry.sdk.metrics.view` documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Python `opentelemetry.sdk.metrics.export` documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry OTLP metrics exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry deployment attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector groupbyattrs processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/groupbyattrsprocessor
- OpenTelemetry Collector OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- Prometheus data model documentation: https://prometheus.io/docs/concepts/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- Updated legacy or deprecated semantic convention attribute names: `http.method` to `http.request.method`, `http.status_code` to `http.response.status_code`, `deployment.environment` to `deployment.environment.name`, `server.instance_id` to `service.instance.id`, and `pod.uid` to `k8s.pod.uid`.
- Updated the HTTP histogram bucket example to match the OpenTelemetry HTTP metric advisory bucket boundaries.
- Corrected the Collector processor description from `metricstransform` to `transform`, because the YAML uses OTTL `metric_statements`.
- Corrected the Collector reaggregation example. `groupbyattrs` compacts/reassociates telemetry but does not itself sum datapoints; the fixed example uses `aggregate_on_attributes("sum", ...)` from the transform processor for datapoint aggregation and keeps `groupbyattrs` only for ResourceMetrics compaction.
- Added `error_mode: ignore` to transform processor examples so missing optional attributes do not drop telemetry through propagated OTTL errors.
- Corrected Python `preferred_temporality` mapping keys to use instrument classes (`Counter`, `Histogram`) instead of strings, as documented by the Python SDK.
- Removed the delta temporality override for `UpDownCounter`; the OTLP exporter delta preset keeps UpDownCounter cumulative, and the post's aggregation explanation is about counters and histograms.
- Updated the PromQL metric-name regex from `http.*` to `http_.*` to match Prometheus-compatible metric naming conventions.
- Reworded the exemplar note so it does not imply all trace linkage is lost when histograms are aggregated.

## Review Notes
The post is technically relevant and accurate after edits. The exact resulting series counts still depend on backend translation, resource attributes retained, histogram representation, and whether older instrumentations emit legacy HTTP conventions.
