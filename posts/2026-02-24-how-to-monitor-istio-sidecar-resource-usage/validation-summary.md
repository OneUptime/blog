# Validation Summary: How to Monitor Istio Sidecar Resource Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar mode
- Envoy proxy metrics
- Kubernetes container and pod metrics
- Prometheus and PromQL
- kube-state-metrics
- Prometheus Operator PrometheusRule
- Grafana dashboard JSON

## Sources Consulted
- Istio Sidecar resource reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio dataplane modes overview: https://istio.io/latest/docs/overview/dataplane-modes/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/

## Issues Found
- The opening sentence said every pod in an Istio mesh runs an Envoy sidecar. Istio also supports ambient mode, so this was narrowed to sidecar-injected pods.
- The CPU ratio query was labeled as usage relative to requests and described as total CPU budget. The query actually compares sidecar CPU usage with application container CPU usage, so the label and explanation were corrected.
- The network PromQL examples were described as sidecar network metrics, but Kubernetes `container_network_*` metrics are pod-level metrics. The queries now filter to sidecar-injected pods using `kube_pod_container_info{container="istio-proxy"}`, and the text clarifies the pod-level limitation.
- The alert expressions divided container usage by kube-state-metrics resource limits without explicit vector matching. Added `on(namespace, pod, container)` and `unit` filters so the PromQL matches usage series to the correct resource limit series.
- The concurrency tuning example used unsupported `sidecar.istio.io/concurrency` and stated a fixed default of 2 worker threads. Replaced it with the documented `proxy.istio.io/config` annotation and corrected the explanation to say Istio determines concurrency from CPU limits when unset.

## Review Notes
- The Prometheus metric names assume a common Kubernetes/cAdvisor plus kube-state-metrics setup. Clusters using managed monitoring stacks may relabel metrics or expose scheduler resource metrics instead of kube-state-metrics container resource metrics.
- The sample Grafana dashboard is illustrative rather than a complete import-ready dashboard because it omits fields such as panel IDs, grid positions, datasource references, and schema metadata.
