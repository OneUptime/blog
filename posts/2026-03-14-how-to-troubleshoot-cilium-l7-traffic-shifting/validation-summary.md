# Validation Summary: Troubleshooting Cilium L7 Traffic Shifting Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium Service Mesh
- CiliumEnvoyConfig
- Envoy admin interface
- Kubernetes Services and EndpointSlices
- kubectl
- Hubble CLI

## Sources Consulted
- Cilium L7 Traffic Shifting documentation: https://docs.cilium.io/en/latest/network/servicemesh/envoy-traffic-shifting/
- Cilium L7-Aware Traffic Management documentation: https://docs.cilium.io/en/stable/network/servicemesh/l7-traffic-management/
- Cilium Service Mesh Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting_servicemesh/
- Cilium `cilium-dbg envoy admin config` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_config/
- Cilium `cilium-dbg envoy admin clusters` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_envoy_admin_clusters/
- Cilium `cilium-dbg envoy admin metrics` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_envoy_admin_metrics/
- Cilium Hubble CLI inspection guide: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The post used `curl -s localhost:9901/config_dump`, `/clusters`, and `/stats` from a Cilium pod. Current Cilium documentation exposes Envoy admin inspection through `cilium-dbg envoy admin ...`, so these commands were changed to `cilium-dbg envoy admin config routes`, `cilium-dbg envoy admin clusters`, and `cilium-dbg envoy admin metrics`.
- The post described checking `CiliumEnvoyConfig` status as the main validation step. Cilium documentation notes that CEC resources have minimal feedback and errors are found by inspecting Envoy config and Cilium agent logs, so the diagnostic command now includes Cilium agent log inspection.
- The post used `kubectl get endpoints`, but the Kubernetes Endpoints API is deprecated in favor of EndpointSlices as of Kubernetes 1.33. The commands were updated to inspect EndpointSlices with the `kubernetes.io/service-name` label.
- The test loop sent only 200 requests while the troubleshooting notes correctly said 1000+ requests are needed for weights to converge. The loop was updated to send 1000 requests.
- The prerequisites mentioned only the Cilium CLI, but the verification command uses `hubble observe`. The prerequisites now include the Hubble CLI.
- The troubleshooting note said to check that the L7 proxy is enabled. The wording was made more precise for this CiliumEnvoyConfig use case by referring to `envoyConfig.enabled` and Cilium agent CEC errors.

## Review Notes
The examples still use placeholder service names such as `backend`, `backend-v1`, and `backend-v2`; readers must adapt them to their own CiliumEnvoyConfig and service names. Hubble commands require Hubble to be enabled and the Hubble API to be reachable, for example through Hubble Relay or port forwarding.
