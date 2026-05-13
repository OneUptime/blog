# Validation Summary: Install Azure CNI with Cilium on AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Powered by Cilium
- Cilium
- Hubble
- Advanced Container Networking Services (ACNS)
- Kubernetes Network Policy and CiliumNetworkPolicy
- Azure CLI
- kubectl

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Powered by Cilium in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Use Advanced Container Networking Services on AKS - https://learn.microsoft.com/en-us/azure/aks/use-advanced-container-networking-services
- Microsoft Learn: Set up container network logs / Hubble CLI and UI for AKS - https://learn.microsoft.com/en-us/azure/aks/how-to-configure-container-network-logs
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Best practices for network policies in AKS - https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices
- Cilium documentation: Installation using Azure CNI Powered by Cilium in AKS - https://docs.cilium.io/en/stable/installation/k8s-install-aks/
- Cilium documentation: Cilium CLI installation and connectivity validation - https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/

## Issues Found
- The post described Cilium as the CNI plugin rather than the managed Cilium data plane used by Azure CNI Powered by Cilium. Updated the description and introduction to use the correct terminology.
- The introduction and conclusion implied transparent encryption and deep observability were included by default. Updated the text to clarify that transit encryption and Hubble-based observability are ACNS features.
- The feature-registration commands used old preview feature flags (`AzureOverlayPreview` and `CiliumDataplane`) that are not part of the current Microsoft Learn setup for Azure CNI Powered by Cilium. Replaced that step with Azure CLI version verification and resource provider registration.
- The `az aks create` command contained a Bash comment immediately after a line-continuation backslash, which would break the command. Removed the inline comment from the continued command.
- The post said the guide verifies installation with Cilium connectivity tests but did not run them. Added `cilium connectivity test`.
- The Hubble section incorrectly used `--enable-azure-monitor-metrics` and `cilium hubble enable --ui` to enable Hubble on AKS. Updated it to enable ACNS with `az aks update --enable-acns`, verify Hubble Relay, port-forward the relay, configure Hubble CLI TLS, and run `hubble observe`.
- Updated best-practice and conclusion language to refer to ACNS for Hubble-based observability.

## Review Notes
The `CiliumNetworkPolicy` example is valid for an L3/L4 ingress policy, assuming the `production` namespace and matching frontend/backend pods exist. The guide now follows current AKS guidance for Azure CNI Powered by Cilium and ACNS-based Hubble observability.
