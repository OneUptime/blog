# Validation Summary: How to Monitor Cilium GAMMA Support in the Cilium Gateway API

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium Gateway API and GAMMA
- Kubernetes Gateway API HTTPRoute
- Prometheus and PromQL
- kube-state-metrics CustomResourceStateMetrics
- Hubble
- Grafana

## Sources Consulted
- Cilium GAMMA Support documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gamma/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Gateway API controller source for the GAMMA controller name: https://github.com/cilium/cilium/blob/main/operator/pkg/gateway-api/gamma.go
- controller-runtime metrics source: https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/internal/controller/metrics/metrics.go
- kube-state-metrics Custom Resource State Metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md
- Hubble observe command help: https://github.com/cilium/cilium/blob/main/hubble/cmd/observe_help.txt

## Issues Found
- The controller-runtime PromQL examples used `controller="httproute"`. Cilium's GAMMA controller is registered as `gammaService`, so the PromQL examples and alert were updated to use `controller="gammaService"`.
- The reconciliation success-rate query omitted controller-runtime's `result` label. The query was updated to filter `result="success"`.
- The architecture diagram showed Prometheus scraping the GAMMA controller directly. Cilium operator metrics are exposed by the operator process, so the diagram now shows Prometheus scraping the Cilium Operator.
- The kube-state-metrics query used a generic `kube_customresource_status_condition` metric and `resource="httproutes"` label. CustomResourceStateMetrics generates metric names from the configured metric name and adds common custom resource labels, so the text and query were updated to state the required configured metric name and use `kube_customresource_httproute_status_condition` with Gateway API custom resource labels.
- The Hubble example used `hubble observe --type trace --follow | grep "mesh-route"`. `--type trace` is a valid event-type filter, but `mesh-route` is not a documented generic marker for GAMMA-routed flows. The example was changed to filter HTTP flows to a target Service with `--protocol http --to-service default/my-service --follow`.
- The introduction referred to eBPF program health as a direct GAMMA monitoring signal. Cilium GAMMA routes L7 traffic through per-node Envoy, so this was corrected to Cilium/Envoy datapath health.

## Review Notes
The kube-state-metrics query still depends on the cluster's CustomResourceStateMetrics configuration. In a future revision, the post could include the matching kube-state-metrics configuration snippet for the `httproute_status_condition` metric.
