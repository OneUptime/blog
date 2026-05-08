# Validation Summary: How to Validate Provision 2 worker nodes in Cilium performance

## Status
validated

## Post Type
Tutorial / operational validation guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF
- Prometheus and Grafana
- Helm

## Sources Consulted
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Kubernetes configuration and CiliumNetworkPolicy examples: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Kubernetes `kubectl expose` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The prerequisites stated a fixed Kubernetes baseline of `v1.21+` for Cilium `v1.14+`. Cilium's supported Kubernetes versions are release-specific, so this was changed to require a Kubernetes version supported by the installed Cilium release.
- Several examples used top-level `cilium` commands for local agent inspection commands documented under `cilium-dbg`, including endpoint, identity, and metrics inspection. These were changed to run `cilium-dbg` through the Cilium DaemonSet with `kubectl -n kube-system exec ds/cilium -- ...`.
- The verification step used `cilium health status`, but the documented health client command is `cilium-health status`. This was corrected to run `cilium-health status` from the Cilium DaemonSet.
- The performance validation text said to "Verify no packet drops" using a grep over metrics. That command only inspects drop/error metrics and does not by itself prove there are no drops, so the wording was changed to "Inspect drop and error metrics."
- Troubleshooting guidance referenced `cilium policy get`, which is documented as a deprecated `cilium-dbg` command. It was replaced with Kubernetes CRD inspection using `kubectl get ciliumnetworkpolicies,ciliumclusterwidenetworkpolicies --all-namespaces`.
- The troubleshooting note used a fixed Linux kernel minimum of 4.19. Current Cilium system requirements are version-dependent, so this was changed to say the node kernel should meet the system requirements for the installed Cilium version.

## Review Notes
The guide remains a high-level validation checklist rather than a benchmark procedure for exactly two worker nodes. Future improvements could add explicit node-count checks and node-selector examples for targeted two-node performance testing.
