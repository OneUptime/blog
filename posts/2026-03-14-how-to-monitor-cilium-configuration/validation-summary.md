# Validation Summary: Monitoring Cilium Configuration Changes and Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Prometheus
- Prometheus Operator
- kube-state-metrics
- Grafana
- Bash
- jq

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus client library metric guidance: https://prometheus.io/docs/instrumenting/writing_clientlibs/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post referenced `cilium_agent_uptime_seconds`, which is not listed in the current Cilium metrics reference. Replaced it with `time() - process_start_time_seconds{namespace="kube-system", pod=~"cilium-.*"}` because Prometheus process metrics expose process start time and can be used to derive uptime.
- The ConfigMap hash script uses `jq`, but `jq` was not listed as a prerequisite. Added it to the prerequisites.
- The version consistency script selected `.spec.containers[0].image`, which assumes the Cilium agent is always the first container. Changed the jsonpath expression to select the container named `cilium-agent`.
- The frequent restart alert used `rate()` on `kube_pod_container_status_restarts_total` and compared the per-second rate to `2`, which does not mean "more than two restarts in 30 minutes." Changed it to `increase(...[30m]) > 2`.
- The version mismatch alert grouped by `container_image`, which is not a kube-state-metrics label for `kube_pod_container_info`. Changed it to group by the documented `image` label and added the `kube-system` namespace filter.
- The verification step port-forwarded `svc/cilium-agent` and grepped for the removed uptime metric. Changed it to port-forward a Cilium pod directly and grep for `process_start_time_seconds`.

## Review Notes
- The Cilium Helm values for enabling agent metrics and ServiceMonitor creation are current.
- The BPF map operation metric is valid when Cilium metrics are enabled; Cilium documents metric names without the exported `cilium_` namespace prefix but states Cilium metrics are exported under that namespace.
- The PrometheusRule resource shape is valid, but in some kube-prometheus-stack installations additional labels may be required for the Prometheus instance's rule selector.
