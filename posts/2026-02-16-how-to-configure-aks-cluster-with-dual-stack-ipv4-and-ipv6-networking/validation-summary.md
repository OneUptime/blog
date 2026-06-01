# Validation Summary: How to Configure AKS Cluster with Dual-Stack IPv4 and IPv6 Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Overlay
- Kubernetes IPv4/IPv6 dual-stack networking
- Azure Virtual Network
- Kubernetes Services and LoadBalancer Services
- NGINX Ingress Controller
- Azure CLI
- kubectl
- Helm

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Overlay networking in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- Microsoft Learn: Use dual-stack networking in AKS - https://learn.microsoft.com/en-us/azure/aks/configure-dual-stack
- Microsoft Learn: Configure a Public Standard Load Balancer in AKS - https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Microsoft Learn: What is IPv6 for Azure Virtual Network? - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-ipv6-overview
- Microsoft Learn: Conceptual planning for IPv6 networking - https://learn.microsoft.com/en-us/azure/architecture/networking/guide/ipv6-ip-planning
- Kubernetes documentation: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The prerequisites said dual-stack AKS requires Kubernetes 1.27 or later and described Azure CNI Overlay as recommended. Updated this to Kubernetes 1.26.3 or later for dual-stack AKS, Azure CNI Overlay as required for this setup, and AKS 1.27 or later for dual-stack LoadBalancer services.
- The `az aks create` example omitted `--network-plugin-mode overlay`. Added it because AKS dual-stack networking with Azure CNI requires Overlay mode for this configuration.
- The `--ip-families` example used `IPv4,IPv6`. Updated the Azure CLI example and explanation to `ipv4,ipv6`, matching Microsoft AKS CLI documentation.
- The service verification command implied `kubectl get svc` would show both ClusterIPs directly. Added a `jsonpath` command that checks `spec.clusterIPs`, which is the Kubernetes field that stores both assigned service IPs.
- The LoadBalancer service used `service.beta.kubernetes.io/azure-load-balancer-ipv6: "true"`. Removed it because the Azure annotation is for specifying a concrete IPv6 address, not enabling IPv6.
- Added `externalTrafficPolicy: Local` to the dual-stack LoadBalancer service to reflect AKS IPv6 service limitations documented for Azure Linux node pools.
- The connectivity test used hard-coded ClusterIP addresses. Replaced them with commands that read the service's assigned IPv4 and IPv6 ClusterIPs before testing.
- The connectivity test implied `kubectl` commands could be run inside a BusyBox pod. Reworked the examples to launch short-lived BusyBox test pods from the local shell.
- The limitations section recommended Calico as an alternative for network policy. Updated it because AKS dual-stack documentation lists both Azure and Calico network policies as unsupported with dual-stack networking.

## Review Notes
The local environment did not have `az` or `kubectl` installed, so CLI behavior was verified against official Microsoft and Kubernetes documentation rather than local command help.
