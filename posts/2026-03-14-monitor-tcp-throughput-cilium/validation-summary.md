# Validation Summary: How to Monitor TCP Throughput (TCP_STREAM) in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Prometheus and Prometheus Operator
- PromQL
- Grafana dashboards
- iperf3
- Prometheus Pushgateway

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium eBPF Maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps.html
- Cilium/Hubble README examples for TCP flag visibility: https://github.com/cilium/hubble
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes API reference for CronJob restartPolicy values: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- iperf3 official documentation and manual page: https://software.es.net/iperf/invoking.html
- Prometheus Pushgateway documentation: https://prometheus.io/docs/instrumenting/pushing/

## Issues Found
- The Grafana dashboard ConfigMap used an API-style wrapper with a top-level `dashboard` object and legacy nested `rows`. Grafana dashboard JSON provisioning expects a dashboard JSON model with top-level fields such as `title`, `panels`, `time`, and panel `gridPos`. Updated the ConfigMap JSON to use the current dashboard JSON model shape.
- The active benchmark CronJob used the `networkstatic/iperf3` image while the script also required `python3` and `curl`. Changed the image to `alpine:3.20` and added `apk add --no-cache iperf3 curl python3` before running the benchmark so the commands used by the script are present.
- The dashboard query labeled FIN packets as TCP error indicators. FIN is a normal TCP connection close flag, not an error by itself. Updated the panel description and query to focus on RST resets.

## Review Notes
- The Cilium and Hubble metric names used in the post match the documented Prometheus namespaces and exported metrics when Cilium and Hubble metrics are enabled.
- Hubble TCP metrics are disabled unless the `tcp` metric is enabled through `hubble.metrics.enabled` or the dynamic metrics exporter, which the troubleshooting section already notes.
- Summed `cilium_forward_bytes_total` is useful as a forwarding-throughput indicator, but it is not the same as an end-to-end application throughput measurement; the active iperf3 benchmark remains the better ground-truth check.
