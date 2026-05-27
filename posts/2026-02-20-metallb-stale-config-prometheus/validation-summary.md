# Validation Summary: How to Use the metallb_k8s_client_config_stale_bool Prometheus Metric

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- MetalLB
- Prometheus
- Prometheus Operator
- PromQL
- Grafana
- Bash

## Sources Consulted
- MetalLB Prometheus metrics documentation: https://metallb.io/prometheus-metrics/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB v0.15.3 native manifest: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus configuration documentation for Kubernetes service discovery and relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- MetalLB source repository for layer 2 metric names: https://github.com/metallb/metallb

## Issues Found
- The metric explanation said MetalLB loaded the latest CRDs when the metric is 0. CRDs are API definitions, not the runtime configuration objects MetalLB loads. Changed this to "latest configuration resources."
- The all-speakers check used `kubectl exec` with `wget` inside MetalLB pods. That depends on tools being present in the container image. Replaced it with `kubectl port-forward` plus local `curl`, matching the access pattern used elsewhere in the post.
- The ServiceMonitor example selected `app.kubernetes.io/name: metallb`, but the upstream raw MetalLB manifest labels controller and speaker pods with `app: metallb` and does not create metrics Services for a ServiceMonitor to select. Added explicit controller and speaker metrics Services and updated the selector to match them.
- The PodMonitor example claimed to scrape speakers and controllers but selected only `component: speaker`. Updated it to select MetalLB controller and speaker pods.
- The static Prometheus scrape config selected `__meta_kubernetes_pod_label_app_kubernetes_io_name`, which does not match the upstream raw MetalLB manifest labels. Updated it to use `__meta_kubernetes_pod_label_app` and added a controller/speaker component filter.
- The alert description referenced a `node` label that is not guaranteed across the shown scrape methods. Removed that label from the annotation and made the runbook text less prescriptive.
- The BGP metric examples did not mention that default FRR-K8s mode uses `frrk8s_bgp_session_up` instead of `metallb_bgp_session_up`. Added that caveat and a matching PromQL example.
- The final verification step used `kubectl exec` with `wget`. Replaced it with `kubectl port-forward` and local `curl`.

## Review Notes
The examples are accurate for the current upstream MetalLB raw manifest pattern. Helm or operator-based installations may use different labels or may create monitoring Services/ServiceMonitors directly, so users should still align selectors with their installed manifests.
