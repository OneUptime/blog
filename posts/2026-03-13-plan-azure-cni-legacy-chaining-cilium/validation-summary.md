# Validation Summary: Plan Azure CNI Legacy Chaining with Cilium

## Status
validated

## Post Type
Tutorial / Planning guide

## Technologies Covered
- Cilium (v1.14)
- Kubernetes
- Azure Kubernetes Service (AKS)
- Azure CNI (legacy)
- Azure VNet networking
- Helm
- eBPF
- Azure CLI (`az`)
- `kubectl`
- `cilium` CLI

## Sources Consulted
- Cilium docs — Azure CNI chaining (stable): https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni/
- Cilium docs — Azure CNI chaining (v1.14): https://docs.cilium.io/en/v1.14/installation/cni-chaining-azure-cni/
- Cilium docs — Azure CNI chaining (v1.13): https://docs.cilium.io/en/v1.13/installation/cni-chaining-azure-cni/
- Azure CLI reference for `az aks show` and `az network vnet subnet show`
- Cilium Helm chart values reference

## Issues Found
1. **Incorrect `cni.chainingMode` value.** The post used `--set cni.chainingMode=azure-cni`. According to the official Cilium docs across v1.13, v1.14, and stable, Azure CNI chaining is implemented through the `generic-veth` chaining mode driven by a custom CNI ConfigMap — there is no `azure-cni` chaining mode in Cilium. Updated to `cni.chainingMode=generic-veth`.
2. **Missing prerequisite ConfigMap.** Azure CNI chaining requires a `cni-configuration` ConfigMap in `kube-system` that explicitly chains the `azure-vnet`, `portmap`, and `cilium-cni` plugins. The post installed Cilium with `cni.exclusive=false` only, which would not produce a working chained data path. Added the documented ConfigMap manifest as a precursor step.
3. **Missing required Helm values.** The original `helm install` command omitted `cni.customConf=true`, `cni.configMap=cni-configuration`, `routingMode=native`, `endpointRoutes.enabled=true`, and `nodeinit.enabled=true`. All of these are required by the documented Azure CNI chaining install. Added them.
4. **Spurious `azure.resourceGroup` flag.** `azure.resourceGroup` is associated with Cilium's Azure IPAM integration for standalone mode, not chaining. Removed it from the chained install command.

## Review Notes
- Cilium documentation now recommends Azure CNI Powered by Cilium or AKS BYO CNI (with standalone Cilium) over legacy chaining for new clusters; the post correctly nudges readers toward Azure CNI Overlay in the Best Practices section.
- `kubectl describe daemonset azure-cni-networkmonitor -n kube-system` in Step 1 will only work on clusters where Microsoft has shipped that DaemonSet — naming varies across AKS releases (e.g. some clusters use `azure-cnms` or have no separate DaemonSet at all). The command will fail benignly if the DaemonSet is absent, so left as-is.
- `cilium connectivity test --test network-policies` uses a regex; the exact test names registered by cilium-cli (e.g. `no-policies`, `client-egress-l7`, etc.) do not literally contain the string `network-policies`, so this filter may match zero tests on some cilium-cli versions. Left unchanged since the flag syntax itself is valid and the intent is clear, but readers may want to use a broader regex such as `--test 'policies|l7'`.
- Cilium 1.14.0 is the explicit version pinned in the post; subsequent 1.14.x patch releases (and 1.15/1.16) maintain the same chaining mode semantics, but readers upgrading should re-check the chaining docs for that minor version.
