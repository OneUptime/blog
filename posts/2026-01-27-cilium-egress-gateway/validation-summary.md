# Validation Summary: How to Configure Cilium Egress Gateway

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium Egress Gateway
- Kubernetes
- Helm
- Hubble CLI and Hubble metrics
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana dashboards

## Sources Consulted
- Cilium Egress Gateway documentation: https://docs.cilium.io/en/stable/network/egress-gateway/egress-gateway/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Prometheus and Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Hubble CLI v1.19.4 `hubble observe --help` output

## Issues Found
- The prerequisites and Helm values omitted `kubeProxyReplacement`, which Cilium requires for Egress Gateway. Added `kubeProxyReplacement: true` and updated the prerequisite check command.
- The basic `CiliumEgressGatewayPolicy` specified both `interface` and `egressIP`. Cilium documents these fields as mutually exclusive and ignores policies that set both, so the example now uses only `egressIP`.
- Several single-gateway examples used a node selector that could match multiple nodes. Cilium selects the first matching node by lexical node name in that case, so the examples now include deterministic labels such as `egress-ip: primary` or `egress-ip: secondary`.
- The high-availability section claimed Cilium would distribute traffic and handle failover from a single `egressGateway` selector. Updated it to use the documented `egressGateways` list and clarified that each endpoint uses one selected gateway.
- The previous external `LoadBalancer` Service example did not configure the source IP used by Cilium Egress Gateway and selected pods, not nodes. Replaced it with provider-managed IP failover guidance and noted that the policy should be re-applied after gateway IP assignment changes.
- The Hubble metrics ConfigMap example used an invalid Kubernetes `data` structure for a list and did not match the recommended Helm values. Replaced it with Helm values for `hubble.metrics.enabled`.
- The Prometheus ServiceMonitor example used likely incorrect service labels. Replaced it with Cilium Helm values that create Prometheus Operator ServiceMonitors.
- The PromQL examples grouped by labels that are not present on the default Hubble `flow` and `drop` metrics. Updated the queries to use documented labels and configured `httpV2` context labels where richer labels are needed.
- The troubleshooting commands used `cilium bpf egress list` and `cilium endpoint list` inside the agent pod. Updated them to the documented `cilium-dbg` commands.

## Review Notes
- Cilium Egress Gateway has documented incompatibilities with Cluster Mesh, `kvstore` identity allocation mode, and CiliumEndpointSlice. The post does not cover these caveats; adding them would improve future completeness.
- Exact external provider failover procedures for AWS, GCP, and Azure remain environment-specific and should be documented per deployment.
