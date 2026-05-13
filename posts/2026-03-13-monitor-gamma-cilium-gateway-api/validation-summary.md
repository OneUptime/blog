# Validation Summary: How to Monitor GAMMA in the Cilium Gateway API

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes Gateway API
- GAMMA service mesh routing
- Hubble
- Prometheus
- kube-state-metrics custom-resource-state metrics
- Grafana

## Sources Consulted
- Cilium GAMMA Support: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gamma/
- Cilium Gateway API Support: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Hubble CLI flow inspection: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Kubernetes Gateway API for Service Mesh: https://gateway-api.sigs.k8s.io/mesh/
- Kubernetes Gateway API HTTPRoute reference: https://gateway-api.sigs.k8s.io/api-types/httproute/
- kube-state-metrics custom-resource-state metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md

## Issues Found
- The introduction said GAMMA routes are enforced in eBPF without mentioning Cilium's per-node Envoy L7 proxy. Updated the wording to match Cilium's documented GAMMA architecture.
- The architecture diagram labeled the route path as only "Cilium eBPF GAMMA". Updated it to "Cilium eBPF + Envoy GAMMA".
- The Hubble command used `--type trace` for HTTP service mesh traffic. Replaced it with the documented `--protocol http` filter.
- The `cilium_policy_l7_total` query grouped by `direction`, but Cilium documents this metric with `rule` and `proxy_type` labels. Updated the query to group by `proxy_type` and adjusted the surrounding text.
- The `cilium_forward_count_total` query filtered on `destination_namespace`, but Cilium documents this metric with only a `direction` label. Updated the query to group by `direction`.
- The alert example used an unsupported-looking `kube_httproute_status_parents_condition` metric with a `status` label. Updated the prerequisite and alert text to make the example depend on kube-state-metrics custom-resource-state metrics and changed the expression to a metric shape consistent with that exporter model.

## Review Notes
The guide is intentionally high level. A future improvement would be to include the kube-state-metrics custom-resource-state configuration that creates `kube_customresource_httproute_status`, because that metric is not emitted automatically by a default kube-state-metrics installation.
