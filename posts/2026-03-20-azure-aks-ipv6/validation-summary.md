# Validation Summary: How to Configure IPv6 on Azure Kubernetes Service (AKS)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Overlay
- Azure Virtual Network
- Azure CLI
- Kubernetes Services
- Kubernetes dual-stack networking
- IPv6

## Sources Consulted
- Microsoft Learn: Configure dual-stack networking in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/configure-dual-stack
- Microsoft Learn: Configure Azure CNI Overlay Networking in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Microsoft Learn: Configure a Public Standard Load Balancer in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Kubernetes Documentation: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Microsoft Learn: Manage virtual networks - https://learn.microsoft.com/en-us/azure/virtual-network/manage-virtual-network
- Microsoft Learn: Azure CLI `az network vnet subnet` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest

## Issues Found
- The VNet example used invalid IPv6 CIDR strings (`fd00:aks::/48` and `fd00:aks:1::/64`). I replaced them with valid IPv6 prefixes so the Azure networking commands are syntactically correct.
- The AKS create example used the single-range `--pod-cidr` form and passed IPv4/IPv6 pod CIDRs as separate arguments. Current AKS dual-stack documentation uses `--pod-cidrs` with a comma-separated IPv4/IPv6 list, so I corrected the command and aligned `--ip-families` usage with the documented dual-stack form.
- The original service CIDR overlapped the example VNet address space (`10.0.0.0/16` inside `10.0.0.0/8`). AKS requires service CIDRs not to overlap subnet/VNet ranges, so I changed the service CIDR and DNS service IP to a non-overlapping range.
- Several verification commands were misleading for dual-stack clusters. `kubectl get nodes -o wide`, `kubectl get pods -o wide`, and `kubectl get svc -o wide` do not reliably show both address families, so I replaced them with `custom-columns` and `jsonpath` commands that expose `podCIDRs`, `podIPs`, and `clusterIPs`.
- The LoadBalancer example used frontend-IP-configuration-name annotations that are not the current documented AKS approach for dual-stack services. I removed those annotations and updated the example to rely on dual-stack Service fields instead.
- The LoadBalancer example omitted the current AKS IPv6 health probe limitation on Linux node pools. I added `externalTrafficPolicy: Local`, which Microsoft documents as required for IPv6 services in this scenario.
- The Service manifests selected `app: web` pods that were never created, so the endpoint checks would have been empty. I added a minimal Deployment to back the Services.
- The test section mixed host-side `kubectl` commands into an interactive pod shell and used a regex JSONPath expression that `kubectl` does not support. I rewrote the test flow to use a long-running test pod plus `kubectl exec`, and I changed IPv6 extraction to a supported `jsonpath` + `grep` pipeline.

## Review Notes
- AKS documentation states that dual-stack `LoadBalancer` Services that receive both an IPv4 and IPv6 public IP are supported starting in AKS v1.27.
- Current Azure CNI Overlay dual-stack docs also list feature limitations, including unsupported Azure network policies, Calico network policies, NAT gateway, and virtual nodes add-on. The post is now technically correct without those details, but they may be worth mentioning in a future revision.
