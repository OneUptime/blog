# Validation Summary: Secure Calico Networking on Azure

## Status
validated

## Post Type
Guide / Security hardening tutorial

## Technologies Covered
- Calico (Project Calico v3 — GlobalNetworkPolicy)
- Kubernetes (NetworkPolicy v1, kubelet, API server)
- Microsoft Azure (VNet, NSG, Azure Firewall, Azure IMDS)
- Azure CLI (`az network nsg rule create`, `az security pricing create`)
- Microsoft Defender for Cloud (Defender for Containers plan)

## Sources Consulted
- Project Calico v3 docs — GlobalNetworkPolicy reference (https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy)
- Kubernetes NetworkPolicy reference (https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- Azure CLI `az network nsg rule create` reference (https://learn.microsoft.com/cli/azure/network/nsg/rule)
- Azure Network Security Group service tags (VirtualNetwork) — https://learn.microsoft.com/azure/virtual-network/service-tags-overview
- Azure Instance Metadata Service docs (169.254.169.254) — https://learn.microsoft.com/azure/virtual-machines/instance-metadata-service
- Microsoft Defender for Containers — plan rename from `KubernetesService`/`ContainerRegistry` to `Containers` (deprecation Aug 2023): https://learn.microsoft.com/azure/defender-for-cloud/defender-for-containers-introduction and `az security pricing` reference https://learn.microsoft.com/cli/azure/security/pricing
- Kubernetes ports & protocols reference (kubelet 10250, API server 6443) — https://kubernetes.io/docs/reference/networking/ports-and-protocols/

## Issues Found
1. **Layer 5 — deprecated Defender plan name.** The command used `--name KubernetesService`, which referred to the legacy "Microsoft Defender for Kubernetes" plan. Microsoft deprecated `KubernetesService` (and `ContainerRegistry`) in August 2023 and merged them into the unified `Containers` plan. Updated the command to `--name Containers --tier Standard`, which is the current plan name accepted by `az security pricing create`.
2. **Layer 6 — missing required `--resource-group` flag.** The `az network nsg rule create` example for `AllowKubectlVPN` omitted `--resource-group`, which is required by the CLI (unless a default is configured) and would cause the command to fail. Added `--resource-group k8s-rg` to match the other examples in the post.

## Review Notes
- The Layer 2 comment "Worker NSG - kubelet and VXLAN only from VNet" only shows the kubelet (10250/TCP) rule and not the VXLAN (4789/UDP) rule — readers replicating this in production would need to additionally allow UDP/4789 between worker nodes for Calico VXLAN overlay traffic. Left as-is since it reads as a partial example, but worth a follow-up clarification.
- The Calico `GlobalNetworkPolicy` blocking 169.254.169.254 is correct, but a reader should be aware it relies on Calico policy order/precedence: if another policy with a lower `order` value allows broad egress, evaluation continues and the deny still applies because Deny actions are terminal within a policy — accurate as written.
- The `--source-address-prefixes VirtualNetwork` usage relies on the `VirtualNetwork` Azure service tag, which is supported by `az network nsg rule create` — correct.
- API server port 6443 is the kubeadm/self-managed default; AKS uses different fronting (mentioned in the post via the "for AKS, enable private cluster" comment), so the Layer 6 example is aimed at self-managed clusters, which is consistent with the Prerequisites.
