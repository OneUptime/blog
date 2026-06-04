# Validation Summary: How to Configure Prometheus Scrape Intervals and Timeout Tuning

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- Prometheus Operator
- kube-prometheus-stack
- Kubernetes ServiceMonitor, PodMonitor, and PrometheusRule resources
- PromQL
- promtool
- Helm templating

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/3.3/storage/
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- kube-prometheus-stack values reference: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml

## Issues Found
- The post stated that `scrape_timeout < scrape_interval` is required. Prometheus and Prometheus Operator require the timeout not to be greater than the interval, so this was changed to `scrape_timeout <= scrape_interval` while preserving the recommendation to keep the timeout lower.
- The scrape lifecycle description implied that Prometheus always opens and closes an HTTP connection for each scrape. This was revised to describe the HTTP scrape request and recorded scrape metrics without making assumptions about connection reuse.
- The ServiceMonitor examples placed `sampleLimit` under `endpoints`. In the Prometheus Operator ServiceMonitor API, `sampleLimit` is a `spec` field, so the examples were corrected.
- The sample limit comments said samples were dropped when the limit was exceeded. Prometheus treats the entire scrape as failed when `sample_limit` is exceeded, so the wording was corrected.
- A PromQL example labeled `prometheus_target_scrapes_exceeded_sample_limit_total` as timeout detection. That metric tracks sample-limit failures, so the label was corrected.
- The storage sizing comment omitted the "per day" unit in the sample calculation. The comment was clarified to avoid a misleading formula.
- The dynamic interval example used Helm template syntax inside Kubernetes YAML without saying it must be rendered by Helm. The snippet comment now identifies it as a Helm template.

## Review Notes
The interval recommendations are workload-dependent guidance rather than Prometheus defaults. The concrete Prometheus defaults, Operator CRD fields, federation example, storage sizing formula, and promtool command were checked against official documentation.
