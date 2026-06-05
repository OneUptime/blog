# Validation Summary: How to Build a Grafana RED Metrics Dashboard from OpenTelemetry Span Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector spanmetrics connector
- OpenTelemetry semantic conventions
- Prometheus and PromQL
- Grafana dashboard provisioning
- Grafana Tempo data links

## Sources Consulted
- OpenTelemetry Collector Contrib spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib spanmetrics connector config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/config.go
- OpenTelemetry Collector Contrib spanmetrics connector factory/source defaults: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/factory.go
- OpenTelemetry Collector Contrib spanmetrics connector metric-building source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/connector.go
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- Prometheus histogram and histogram_quantile documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Tempo TraceQL search documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/query-editor/traceql-search/

## Issues Found
- The Collector config used the deprecated connector type `spanmetrics`. Changed it to `span_metrics`, which is the current component type documented by the upstream spanmetrics connector.
- The histogram bucket list used bare decimal values while the connector expects duration values. Changed the buckets to duration literals such as `5ms`, `1s`, and `10s`, and explicitly set `histogram.unit: ms` so the documented `duration_milliseconds_*` Prometheus metrics match the queries.
- The config used `dimensions_cache_size`, which is deprecated. Replaced it with `aggregation_cardinality_limit`.
- The comment implied `dimensions_cache_size` filtered span kinds. That setting does not filter server or consumer spans, so the comment was corrected to describe cardinality limiting.
- The HTTP dimensions used older semantic convention names `http.method` and `http.status_code`. Updated them to the stable HTTP span attributes `http.request.method` and `http.response.status_code`, and updated the PromQL status-code label to `http_response_status_code`.
- The default spanmetrics namespace would prefix metric names. Added `namespace: ""` so the generated Prometheus metric names match the article's `calls_total` and `duration_milliseconds_*` queries.
- The Grafana provisioning config used `editable`, which is not the dashboard provisioning field documented by Grafana. Replaced it with `allowUiUpdates`.
- The Grafana provisioning config combined a fixed `folder` with `foldersFromFilesStructure`. Grafana documents that `folder` and `folderUid` must be unset when using `foldersFromFilesStructure`, so `foldersFromFilesStructure` was removed.

## Review Notes
The PromQL `histogram_quantile` examples correctly keep `le` in the aggregation for classic Prometheus histograms. The Tempo data-link example is plausible for Grafana Explore, but production dashboards should URL-encode the Explore state JSON if the link is embedded in contexts that do not encode it automatically.
