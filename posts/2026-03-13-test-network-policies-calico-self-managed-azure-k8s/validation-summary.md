# Validation Summary: How to Test Network Policies with Calico on Self-Managed Azure Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- Calico
- calicoctl
- Azure Virtual Machines
- Azure Kubernetes Service
- VXLAN
- DNS

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Azure public cloud reference: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico overlay networking documentation: https://docs.tigera.io/calico-cloud/networking/configuring/vxlan-ipip
- Microsoft Learn, Secure Pod Traffic with Network Policies in AKS: https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn, AKS network policy best practices: https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices

## Issues Found
- The introduction stated that self-managed Kubernetes on Azure runs Calico as a full CNI and contrasted that with all AKS Calico usage. Changed this to say self-managed clusters can run Calico as a full CNI, and narrowed the AKS comparison to Azure CNI clusters where Calico is used for policy enforcement only.
- The Azure networking explanation said IPIP may be blocked by NSG rules and that VXLAN is more reliably allowed by default NSG configurations. Calico's Azure documentation says Azure does not support IP-in-IP traffic and supports Calico VXLAN, so the wording was corrected.
- The BusyBox `kubectl run` examples used `-- sleep 3600` without `--command`. The official `kubectl run` reference says extra arguments are treated as container args unless `--command` is set, so the BusyBox pods could exit instead of sleeping. Added `--command` to the BusyBox pod commands.
- The DNS egress policies allowed only UDP port 53. Added TCP port 53 as well, because DNS can use TCP and restricting to UDP alone can break valid DNS lookups.

## Review Notes
- The embedded NetworkPolicy manifests use the current stable `networking.k8s.io/v1` API and valid selector, `policyTypes`, ingress, egress, and port fields.
- `kubectl`, `calicoctl`, `ruby`, and `yq` were not installed in the local environment, so local command execution and schema validation were not available. The review used official Kubernetes, Calico, and Microsoft documentation instead.
