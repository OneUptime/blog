# Validation Summary: How to Configure Istio with Azure CNI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio CNI
- Azure Kubernetes Service (AKS)
- Azure CNI
- Kubernetes NetworkPolicy
- Azure Load Balancer
- Azure CLI
- kubectl

## Sources Consulted
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio NetworkPolicy documentation: https://istio.io/latest/docs/setup/additional-setup/network-policy/
- Istio Azure platform setup documentation: https://istio.io/latest/docs/setup/platform-setup/azure/
- Istio health probe rewrite documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio supported releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Microsoft AKS Azure CNI concepts documentation: https://learn.microsoft.com/en-us/azure/aks/concepts-network-legacy-cni
- Microsoft AKS network policy best practices: https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices
- Microsoft AKS Load Balancer annotations documentation: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard

## Issues Found
- The prerequisite listed `istioctl` version 1.20+, but Istio 1.20 is outside the current support window. Changed this to require `istioctl` from a currently supported Istio release.
- The IP planning section said sidecars effectively double pod count. Sidecars add containers to existing pods and share the pod IP, so I changed this to say they double container count.
- The IstioOperator example used `sidecarInjectorWebhook.rewriteAppHTTPProbers`, but the current install value is `rewriteAppHTTPProbe`. Updated the field name.
- The CNI component example omitted the CNI namespace used in Istio's official example. Added `namespace: istio-system`.
- The network policy section implied Azure CNI alone provides Kubernetes network policy enforcement and showed a policy that opened Istio sidecar interception ports on application pods. Replaced this with the current AKS network policy engine guidance and Istio's built-in `values.global.networkPolicy.enabled` setting for Istio components.
- The Azure Load Balancer example used a generic health probe request-path annotation. For Istio gateways on AKS, the current Istio Azure guidance uses port-specific probe annotations; changed the example to use TCP health probes for ports 80 and 443.
- The Bookinfo sample URL pointed at the old Istio 1.20 branch. Updated it to the current supported 1.30 branch.
- The summary still said to configure network policies to allow sidecar traffic. Changed it to recommend configuring policies around exposed application ports.

## Review Notes
- Azure Network Policy Manager remains listed in Microsoft documentation, but Microsoft recommends Cilium for AKS network policy going forward. Future revisions should consider focusing examples on Azure CNI powered by Cilium.
- Azure CNI has multiple modes, including node subnet, pod subnet dynamic allocation, static block allocation, and overlay. This post mostly describes the traditional/node-subnet behavior where pod IP planning is a major concern.
