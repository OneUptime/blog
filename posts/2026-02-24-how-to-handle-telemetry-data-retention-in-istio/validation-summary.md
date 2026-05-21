# Validation Summary: How to Handle Telemetry Data Retention in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Kubernetes
- Prometheus and Prometheus Operator
- kube-prometheus-stack Helm chart
- Jaeger Operator
- Grafana Tempo
- Thanos
- PrometheusRule recording and alerting rules

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- prometheus-community kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Jaeger Operator documentation: https://www.jaegertracing.io/docs/1.24/operator/
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Thanos Compactor documentation: https://thanos.io/tip/components/compact.md/

## Issues Found
- The Thanos retention example used a generic YAML shape under `thanos.store` that is not the official Thanos retention configuration. I changed it to the official Thanos Compactor retention flags: `--retention.resolution-raw`, `--retention.resolution-5m`, and `--retention.resolution-1h`.
- The Prometheus cleanup CronJob incorrectly claimed that `clean_tombstones` cleans old TSDB blocks and `snapshot` triggers compaction. Prometheus documentation says `clean_tombstones` only removes data already marked by `delete_series`, and `snapshot` creates a backup snapshot. I replaced the CronJob with guidance to enforce retention through backend retention settings.

## Review Notes
- The Istio Telemetry API examples use current `telemetry.istio.io/v1` fields and valid metric/access-log constructs.
- The Prometheus Operator `retention` and `retentionSize` fields are valid, but exact Helm values and StatefulSet names can vary by kube-prometheus-stack release and installation name.
- The Jaeger Operator example is valid for the Jaeger v1 operator CRD style; teams using newer tracing stacks should verify operator version compatibility.
