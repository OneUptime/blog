# Validation Summary: How to Diagnose Envoy Proxy High Memory Usage in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio sidecar mode
- Envoy proxy
- Kubernetes pods, container resources, and OOMKilled status
- kubectl and istioctl
- Prometheus and PrometheusRule alerts
- kube-state-metrics

## Sources Consulted
- Istio Sidecar resource reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio Envoy access log documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Envoy admin interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Envoy statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Envoy memory admin proto documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/memory.proto
- Envoy flow-control FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/flow_control
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus vector matching operators reference: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The post described the difference between `server.memory_heap_size` and `server.memory_allocated` as fragmentation. Envoy documents heap size as reserved heap and allocated as heap bytes currently allocated to Envoy, so the gap can include free heap retained by TCMalloc as well as fragmentation. Updated the wording.
- The Sidecar resource section claimed a specific 50-80% memory reduction. Official Istio docs support configuration scoping with Sidecar resources, but not that exact percentage. Replaced it with a qualitative claim.
- The body-buffer diagnostic command used non-standard stat names. Envoy documents `downstream_rq_too_large` and `rs_too_large` for request/response bodies that exceed buffer limits, so the grep pattern was corrected.
- The access logging section overstated stdout/file logging guidance. Istio documents Envoy access logs to standard output; the recommendation was changed to filtering or disabling access logging where it is not needed.
- The PromQL examples divided cAdvisor memory usage by kube-state-metrics limits without explicit vector matching or the `unit="byte"` label. Updated dashboard and alert expressions to use `on(namespace,pod,container) group_left` and filter memory limits by byte units.

## Review Notes
Some Envoy stat names vary with Istio and Envoy configuration, and Istio defaults intentionally collect a smaller set of Envoy stats to reduce proxy overhead. The commands are valid, but operators should verify stat availability in their mesh before building alerts around individual Envoy stat names.
