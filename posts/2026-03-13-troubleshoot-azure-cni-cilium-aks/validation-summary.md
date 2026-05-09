# Validation Summary: Troubleshoot Azure CNI with Cilium on AKS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI powered by Cilium
- Cilium and CiliumNetworkPolicy
- Hubble observability
- Kubernetes kubectl
- Azure CLI
- eBPF networking

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Powered by Cilium in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Best practices for network policies in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices
- Microsoft Learn: Set up Container Network Observability for Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/container-network-observability-how-to
- Microsoft Learn: Troubleshoot Container Network Insights Agent on AKS: https://learn.microsoft.com/en-us/azure/aks/troubleshoot-container-network-insight-agent
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl reference: kubectl debug: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Cilium documentation: Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium documentation: cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium documentation: cilium-dbg monitor: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium documentation: Policy troubleshooting: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Cilium documentation: Setting up Hubble Observability: https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- The prerequisite described the setup as "Azure CNI and Cilium network policy enabled." Updated it to "Azure CNI powered by Cilium enabled" to match AKS terminology and the supported managed configuration.
- The Cilium image check used `grep cilium-image` against the `cilium-config` ConfigMap. AKS documents that only label exclusion changes are supported in this ConfigMap, and the image is more reliably read from the Cilium DaemonSet. Replaced the command with a DaemonSet image jsonpath query.
- The in-agent troubleshooting commands used `cilium endpoint list`, `cilium policy get`, `cilium debuginfo`, and `cilium monitor`. Current Cilium command reference exposes these as `cilium-dbg` commands inside the Cilium agent context. Updated the commands accordingly.
- The `cilium monitor --from <pod-ip>` example was incorrect because `--from` filters by source endpoint ID, not pod IP. Updated the placeholder and comment to use `<endpoint-id>`.
- The `kubectl debug node` command read `/etc/cni/net.d/10-azure.conflist` directly. Kubernetes mounts the node root filesystem at `/host` in node debug pods, so the command was corrected to `/host/etc/cni/net.d/10-azure.conflist`.
- The policy section said `cilium debuginfo | grep -i policy` would trace a specific connection. That command collects debug information but does not trace one connection. Updated the comment to describe what the command actually does.
- The Hubble section recommended `cilium hubble enable`. On AKS-managed Azure CNI powered by Cilium, Hubble should be enabled through AKS Advanced Container Networking Services rather than by directly patching Cilium configuration with the upstream Cilium CLI. Replaced it with a Hubble relay verification command.

## Review Notes
The guide is technically relevant and salvageable. Hubble availability on AKS depends on Advanced Container Networking Services, and some deeper Cilium configuration changes remain unsupported on AKS-managed Cilium even though they are valid in self-managed Cilium installations.
