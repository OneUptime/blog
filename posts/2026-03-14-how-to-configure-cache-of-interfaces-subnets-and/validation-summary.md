# Validation Summary: Configuring Interface, Subnet, and VirtualNetwork Caching in Cilium IPAM

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium Azure IPAM
- CiliumNode custom resources
- Helm
- kubectl
- Azure virtual networking

## Sources Consulted
- Cilium Azure IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/azure/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium kube-proxy-free Azure IPAM Helm example: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium operator Azure command reference: https://docs.cilium.io/en/stable/cmdref/cilium-operator-azure/
- Cilium IPAM overview: https://docs.cilium.io/en/stable/network/concepts/ipam/

## Issues Found
- The post implied that the Azure IPAM interface cache refresh interval could be configured with an `operator.resources` snippet. Cilium documents the Azure IPAM cache update behavior as once per minute, plus after allocation with allocation-triggered updates capped to once per second. I changed the text to describe this behavior and kept `operator.resources` as resource sizing only.
- The Helm values snippet used a non-existent nested `ipam.azure.resourceGroup` field and omitted the documented Azure credential fields. I changed the example to use top-level `azure.resourceGroup`, `azure.subscriptionID`, `azure.tenantID`, `azure.clientID`, and `azure.clientSecret` with `ipam.mode: azure` and `azure.enabled: true`.
- The post queried `.spec.azure.interfaces`, but Cilium documents Azure interfaces on `status.azure.interfaces`; available IPs are published under `spec.ipam.available`. I updated the `jq` examples and monitoring script accordingly.
- The operator log selector used `name=cilium-operator`, while current Cilium Helm labels identify the operator pods with `io.cilium/app=operator`. I updated the `kubectl logs` commands.
- The troubleshooting advice said to increase the resync interval for API rate limiting, but the Azure IPAM cache interval is not exposed as a Helm value. I changed this to refer to operator external API rate limiting and operator replica review.
- The permissions note referred generically to listing subnets in the resource group. I changed it to the documented AKS node resource group scope and the relevant Azure resources Cilium lists or updates.
- The Mermaid diagram implied subnet and virtual network data are written directly to CiliumNode resources. I adjusted the flow so subnet and VNet cache data feed allocation capacity checks, which then publish available IP information through CiliumNode resources.

## Review Notes
- Azure IPAM is documented by Cilium as legacy and not compatible with AKS clusters created in Bring Your Own CNI mode. The post is still technically relevant for deployments using Cilium's Azure IPAM mode, but a future revision should call out this compatibility caveat explicitly.
- The examples assume the `jq`, `helm`, `kubectl`, and `cilium` CLIs are installed and configured.
