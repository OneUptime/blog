# Validation Summary: How to Monitor Cilium GAMMA Support

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium GAMMA support
- Kubernetes Gateway API
- Hubble
- Prometheus
- Grafana
- PromQL

## Sources Consulted
- Cilium GAMMA Support documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gamma/
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- The prerequisites did not mention the kube-proxy replacement and L7 proxy requirements for Cilium GAMMA. I updated the prerequisite to include Gateway API enabled with kube-proxy replacement and the L7 proxy.
- The monitoring surfaces were described as operator and agent metrics, and Hubble was described as showing routing decisions. I changed this to agent and Hubble metrics, with Hubble showing flow verdicts and L7 request details.
- `cilium_policy_l7_total` was described as L7 policy decisions and queried with a non-documented `direction` label. Cilium documents it as total L7 requests/responses with `rule` and `proxy_type` labels, so I updated the description and query.
- `cilium_forward_count_total` was described as per-endpoint and used with `destination_namespace` and `destination_workload` labels. Cilium documents this counter with only the `direction` label, so I removed the workload-based query from that metric.
- The backend distribution query needed workload and namespace labels, which are available through Hubble HTTP metrics when context labels are enabled. I changed the query to use `hubble_http_requests_total` with `destination_namespace` and `destination_workload`.
- The drop alert used `reason="POLICY_DENIED"`, but Cilium drop metric labels commonly use human-readable reasons such as `Policy denied`. I changed the selector to `reason=~"Policy denied.*"` to match documented/current metric behavior more reliably.
- The architecture diagram implied GAMMA routing was handled directly by Cilium eBPF only. Cilium documentation says GAMMA intercepts L7 traffic and routes it through the per-node Envoy proxy, so I updated the diagram to include the Cilium L7 proxy / Envoy.

## Review Notes
- The Hubble `observe` examples use documented flags such as `--namespace`, `--follow`, `--verdict`, and `--since`. Service filters are supported, but operators should use names in the form expected by their Hubble CLI version, typically `[namespace/]<service-name>` when not relying on a separate namespace filter.
- The Hubble HTTP metric query assumes Hubble `httpV2` metrics are enabled with destination labels such as `destination_namespace` and `destination_workload`.
