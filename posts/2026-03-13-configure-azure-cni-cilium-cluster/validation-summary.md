# Validation Summary: Configure Azure CNI with Cilium on AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Overlay
- Azure CNI Powered by Cilium
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Advanced Container Networking Services (ACNS)
- Hubble

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Powered by Cilium in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Use Advanced Container Networking Services on your Azure Kubernetes Service (AKS) cluster: https://learn.microsoft.com/en-us/azure/aks/use-advanced-container-networking-services
- Microsoft Learn: Set up container network logs: https://learn.microsoft.com/en-us/azure/aks/how-to-configure-container-network-logs
- Microsoft Learn: Azure CLI `az aks create` reference: https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest#az-aks-create
- Cilium documentation: Installation using Azure CNI Powered by Cilium in AKS: https://docs.cilium.io/en/stable/installation/k8s-install-aks/
- Cilium documentation: Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium documentation: Cilium Endpoint CRD: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint.html
- Cilium documentation: Network policy language: https://docs.cilium.io/en/stable/security/policy/language/

## Issues Found
- The introduction described Cilium primarily as a network policy engine alongside Azure CNI and implied Hubble observability was directly part of the baseline setup. Updated the wording to describe Cilium as the AKS managed network dataplane and policy engine, and moved observability to ACNS.
- The prerequisites omitted the Azure CLI version required by the AKS documentation for Azure CNI Powered by Cilium overlay mode. Added Azure CLI 2.48.1 or later.
- The AKS creation command omitted `--pod-cidr`, which official AKS and Cilium examples include for overlay clusters. Added `--pod-cidr 192.168.0.0/16`.
- Step 3 said Cilium was functioning as both the CNI and network policy engine. In Azure CNI Powered by Cilium, Azure CNI is still the AKS networking integration while Cilium provides the dataplane and policy enforcement. Updated the section title and wording.
- The command `cilium endpoint list` is not a top-level Cilium CLI command in current Cilium CLI documentation. Replaced it with `kubectl get ciliumendpoints --all-namespaces`, which is the documented way to list CiliumEndpoint CRDs for pods.
- Step 5 used `cilium hubble enable --ui`, which is not the supported way to enable observability on managed AKS Cilium clusters because AKS manages most Cilium configuration. Replaced it with `az aks update --enable-acns` and a Hubble Relay verification command aligned with Microsoft documentation.
- The best practices and conclusion implied direct Hubble observability as part of the managed Cilium baseline. Updated these references to use Advanced Container Networking Services.

## Review Notes
The `CiliumNetworkPolicy` L3/L4 example is syntactically valid and uses the supported `cilium.io/v2` API. L7 Cilium policies, FQDN filtering, and full container network observability on AKS have ACNS-related requirements and version caveats that should be called out if the post is expanded later.
