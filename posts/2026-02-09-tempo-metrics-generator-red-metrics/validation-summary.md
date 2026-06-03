# Validation Summary: Configure Tempo Metrics Generator to Create RED Metrics from Kubernetes Traces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Grafana Tempo metrics-generator
- Tempo span metrics and service graphs
- Prometheus remote write receiver
- PromQL
- Grafana dashboards and alerting rules

## Sources Consulted
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo span metrics processor documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/
- Grafana Tempo service graph view documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/service-graph-view/
- Prometheus command-line flag documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/time-series/

## Issues Found
- Tempo metrics-generator processors were configured but not enabled. Added the required `overrides.defaults.metrics_generator.processors` entries for `service-graphs` and `span-metrics`, matching Tempo's documented enablement model.
- The Prometheus section used `remote_write` in `prometheus.yml` as if it enabled receiving remote-write samples. Prometheus requires the `--web.enable-remote-write-receiver` command-line flag for `/api/v1/write`, so the snippet now states that requirement and removes the incorrect self-remote-write configuration.
- PromQL examples used the `service_name` label, but Tempo span metrics document the default intrinsic service label as `service`. Updated dashboard variables, dashboard queries, alert groupings, and alert annotations to use `service`.
- Duration examples treated Tempo histogram values as milliseconds. Tempo span metric histogram buckets are seconds, so the dashboard title now says seconds and the high-latency alert threshold was changed from `1000` to `1`.
- The Grafana dashboard used the legacy `graph` panel type and a raw `nodeGraph` panel query. Updated time-series panels to use `timeseries` and changed the service graph panel to a time-series request-rate query grouped by `client` and `server`.

## Review Notes
The examples are suitable for a single-binary/demo Tempo deployment using local storage and `emptyDir`; production Kubernetes deployments should use persistent/object storage, explicit Prometheus deployment arguments, and cardinality controls for added span/resource dimensions.
