# Validation Summary: How to Configure Flux with Workload Identity for Key Vault on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID
- Azure Key Vault
- Azure RBAC
- Azure CLI
- Flux
- Kubernetes
- Secrets Store CSI Driver and Azure Key Vault provider

## Sources Consulted
- Microsoft Learn: Use Microsoft Entra Workload ID with Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Deploy and configure an AKS cluster with Microsoft Entra Workload ID - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Connect your Azure identity provider to the Azure Key Vault Secrets Store CSI Driver in AKS - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Microsoft Learn: Use the Azure Key Vault provider for Secrets Store CSI Driver in AKS - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- Microsoft Learn: az role assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Flux documentation: flux bootstrap github - https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Azure Workload Identity documentation: Service account labels and annotations - https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html

## Issues Found
- The post placed `azure.workload.identity/use: "true"` on the ServiceAccount. Current AKS and Azure Workload Identity documentation require this label on the pod template for the mutating admission webhook to inject the projected token and Azure environment variables. Removed the ServiceAccount label and added the label to the Deployment pod template.
- The troubleshooting section also referred to the label as a service account label. Updated it to say the label must be present on the pod template.
- The Key Vault role assignment used `--assignee-object-id` without `--assignee-principal-type ServicePrincipal`. Microsoft examples include the principal type to avoid Microsoft Graph propagation and lookup issues for service principals. Added the flag.
- The prerequisites did not mention that the Key Vault should use Azure RBAC authorization, even though the guide grants access with the `Key Vault Secrets User` Azure RBAC role. Updated the prerequisite to make the access model explicit.
- The prerequisites did not mention enabling the Azure Key Vault provider for Secrets Store CSI Driver, but the application example uses `SecretProviderClass` with the Azure provider. Added that prerequisite.
- The Flux bootstrap example used `--owner=my-org` with `--personal`. Flux documents `--personal` as meaning the owner is a GitHub user rather than an organization. Removed `--personal` from the organization-owned repository example.

## Review Notes
The guide is technically valid after these corrections. Future improvements could include showing the exact command to enable the AKS Key Vault Secrets Store CSI Driver add-on and showing how to set `AZURE_TENANT_ID`, but those are completeness improvements rather than correctness fixes.
