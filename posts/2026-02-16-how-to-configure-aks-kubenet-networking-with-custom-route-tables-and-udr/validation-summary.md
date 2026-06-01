# Validation Summary: How to Configure AKS Kubenet Networking with Custom Route Tables and UDR

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubenet networking
- Azure CNI and Azure CNI Overlay
- Azure Virtual Network and subnets
- Azure route tables and user-defined routes
- Azure Firewall / network virtual appliances
- Azure CLI
- Managed identities and Azure RBAC

## Sources Consulted
- Microsoft Learn: Use kubenet networking with your own IP address ranges in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Microsoft Learn: Customize cluster egress with outbound types in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/egress-outboundtype
- Microsoft Learn: Customize cluster egress with a user-defined routing table in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/egress-udr
- Microsoft Learn: Limit Network Traffic with Azure Firewall in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-gb/azure/aks/limit-egress-traffic
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks

## Issues Found
- The AKS create command used `--service-cidr 10.0.4.0/24`, which overlapped with the VNet address space `10.0.0.0/16`. AKS cluster service, pod, and VNet ranges must not overlap. Changed the service CIDR to `10.2.0.0/24` and the DNS service IP to `10.2.0.10`.
- The guide created a Kubenet cluster with a custom route table and `userDefinedRouting` without configuring user-assigned managed identities before cluster creation. Microsoft documentation recommends a user-assigned managed identity for Kubenet with a bring-your-own route table, and user-defined routing with Kubenet should not rely on a system-assigned identity. Added commands to create user-assigned identities, assign Network Contributor permissions to the subnet and route table before cluster creation, and pass `--assign-identity` and `--assign-kubelet-identity` to `az aks create`.
- The permissions step assigned Network Contributor after cluster creation, which is too late for the custom route table workflow. Updated the step to verify the role assignments instead, after moving the actual assignments before cluster creation.
- The scaling section stated that each Kubenet node supports 250 pods per node by default. AKS defaults Kubenet to 110 pods per node, with 250 as the configurable maximum. Updated the wording to distinguish the default from the maximum.
- Added a retirement caveat noting that Microsoft has announced Kubenet networking for AKS will be retired on March 31, 2028, and that new designs should evaluate Azure CNI Overlay.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against official Microsoft Learn documentation rather than local `az --help` output.
