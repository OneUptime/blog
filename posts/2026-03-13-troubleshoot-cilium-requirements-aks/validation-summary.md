# Validation Summary: Troubleshooting Cilium Requirement Issues on AKS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Azure Kubernetes Service (AKS)
- Azure CNI
- Azure CLI
- Helm
- eBPF

## Sources Consulted
- Cilium Azure CNI legacy chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni/
- Cilium CNI chaining overview: https://docs.cilium.io/en/stable/installation/cni-chaining/
- Cilium system requirements and firewall rules: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium performance tuning and eBPF host-routing documentation: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Azure CNI powered by Cilium / Azure CNI update documentation: https://learn.microsoft.com/en-us/azure/aks/update-azure-cni
- AKS OS version upgrade documentation: https://learn.microsoft.com/en-us/azure/aks/upgrade-os-version
- AKS Azure CNI dynamic IP allocation documentation: https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni-dynamic-ip-allocation
- Azure CLI `az aks nodepool` reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool

## Issues Found
- The Azure CNI chaining Helm value `cni.chainingMode=azure-cni-powered-by-cilium` was not a valid Cilium chaining mode. Replaced it with the documented Azure CNI legacy chaining settings, including `generic-veth`, custom CNI config, non-exclusive CNI mode, node init, native routing, and endpoint routes.
- The kernel guidance referred to AKS Ubuntu 18.04 and described Ubuntu 22.04 as "full eBPF support." Updated the guidance to Cilium's current Linux kernel 5.10 requirement and AKS's current Ubuntu 22.04 and 24.04 default behavior by Kubernetes version.
- The node pool OS migration command used `--node-os-upgrade-channel` with `az aks nodepool update`, which is not the documented node pool OS SKU migration flow. Removed that flag and kept the supported `--os-sku Ubuntu` node pool update.
- The NSG rule example did not specify inbound direction or scope the source to the virtual network. Added `--direction Inbound` and `--source-address-prefixes VirtualNetwork`.
- The eBPF host-routing checks looked for the wrong status label and used a non-existent Helm value, `bpf.hostRouting=true`. Updated the status grep to `Host Routing` and changed enablement to the documented `bpf.masquerade=true` and `kubeProxyReplacement=true` requirements.
- The kernel check in the host-routing section used local `uname -r`, which checks the operator workstation rather than AKS nodes. Replaced it with a Kubernetes node kernel query.
- The IP exhaustion remediation incorrectly suggested `az aks update --max-pods 250`, which does not solve Azure CNI IP exhaustion and can increase IP demand. Replaced it with checks for the AKS network profile and node pool subnet settings, plus a node pool add example using a larger node or pod subnet.

## Review Notes
The post is technically relevant and contains executable troubleshooting commands. Some guidance remains intentionally generic because AKS supports several Azure CNI IPAM modes; future improvements could split remediation steps by Azure CNI Overlay, Azure CNI Node Subnet, and Azure CNI Pod Subnet modes.
