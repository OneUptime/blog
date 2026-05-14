# Validation Summary: Cilium CNI Configuration in IPAM: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium CNI
- Cilium IPAM
- Kubernetes
- Helm
- kubectl
- Prometheus metrics
- eBPF networking

## Sources Consulted
- Cilium Kubernetes configuration documentation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium cluster-pool IPAM tutorial: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium cluster-pool IPAM concepts and troubleshooting: https://docs.cilium.io/en/stable/network/concepts/ipam/cluster-pool/
- Cilium Kubernetes host-scope IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium agent command reference: https://docs.cilium.io/en/latest/cmdref/cilium-agent/
- Cilium debug CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Cilium v1.19.4 Helm chart values and CNI config templates from the official Cilium repository: https://github.com/cilium/cilium/tree/v1.19.4

## Issues Found
- The post referenced `/etc/cni/net.d/05-cilium.conf`, but current Cilium Helm-managed installations write `/etc/cni/net.d/05-cilium.conflist`. Updated the path.
- The example CNI JSON used a single-plugin `.conf` shape. Updated it to the current `.conflist` shape with a `plugins` array and the Cilium CNI `log-file` field.
- Commands using `kubectl debug node` read host files under container paths. Kubernetes mounts the node filesystem at `/host`, so the CNI config, CNI log, and socket checks were updated to `/host/...`.
- The troubleshooting and validation examples used non-current CiliumNode status fields such as `.status.ipam.available` and `.status.ipam.allocated`. Replaced them with `spec.ipam.podCIDRs`, `status.ipam["operator-status"]`, and `cilium-dbg` checks that match current Cilium behavior.
- The post used `cilium` inside the agent pod for debug commands. Updated examples to `cilium-dbg`, which is the documented CLI for interacting with the local Cilium agent.
- The metrics example grepped for `ipam_allocated`, which is not the documented current Cilium metric. Updated it to use documented Cilium IPAM metric names under the `cilium_` namespace and added the required `prometheus.enabled=true` Helm value.
- The `kubectl port-forward ds/cilium` example was replaced with port-forwarding to a selected Cilium pod, which is a broadly supported `kubectl port-forward` target.

## Review Notes
The guide is now technically consistent with current Cilium stable documentation. Some operational examples remain intentionally generic and may need adaptation for non-default IPAM modes such as ENI, Azure, GKE, delegated plugin, or CNI chaining deployments.
