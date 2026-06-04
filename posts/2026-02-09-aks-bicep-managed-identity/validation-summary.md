# Validation Summary: How to Build Azure AKS Clusters with Bicep Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Bicep
- Azure managed identities
- Azure Container Registry (ACR)
- Microsoft Entra Workload ID
- Azure RBAC role assignments
- Kubernetes service accounts and pods

## Sources Consulted
- Microsoft Learn: Microsoft.ContainerService/managedClusters Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.containerservice/2023-10-01/managedclusters
- Microsoft Learn: Supported Kubernetes versions in AKS: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Overview of managed identities in AKS: https://learn.microsoft.com/en-us/azure/aks/managed-identity-overview
- Microsoft Learn: Use a pre-created kubelet managed identity in AKS: https://learn.microsoft.com/en-us/azure/aks/pre-created-kubelet-managed-identity
- Microsoft Learn: Use Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Federated identity credentials Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.managedidentity/userassignedidentities/federatedidentitycredentials
- Microsoft Learn: Bicep CIDR functions: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-cidr
- Local Bicep CLI 0.43.8 compile checks for the standalone Bicep snippets.

## Issues Found
- The examples pinned Kubernetes version `1.28.3`, which is no longer a supported AKS version as of the 2026-06-04 review date. Updated the examples to use the supported minor-version alias `1.35`, which lets AKS select the latest GA patch for that minor version.
- The basic AKS template set `vnetSubnetID: null`. Because this is an optional string property and no custom subnet is used, removed the property instead of passing a null value to the AKS API.
- The user-assigned identity example included a Network Contributor role assignment scoped to the resource group while the template did not create or reference a custom subnet. Removed the misleading over-broad role assignment.
- The ACR section described pushing and pulling images without credentials. AKS managed identity covers node image pulls from ACR, not developer pushes. Updated the text to describe pulling images without Kubernetes image pull secrets.
- The ACR section referred generally to "managed identity" for image pulls. Clarified that ACR pull permissions are granted to the kubelet managed identity.
- The workload identity section said the pod automatically gets credentials. Clarified that the workload identity webhook injects environment variables and a projected token that Azure Identity client libraries and MSAL use.

## Review Notes
- The standalone Bicep snippets compile with Bicep CLI 0.43.8 after the fixes. The `main.bicep` module wrapper does not compile in isolation because the post intentionally references `modules/identity.bicep` and `modules/aks.bicep` without including their contents; the included `modules/network.bicep` snippet compiles separately.
- AKS patch availability varies by region. Using a supported minor-version alias is less brittle than pinning an exact patch in a blog post.
