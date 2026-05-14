# Validation Summary: How to Set Up Flux CD on Azure AKS with Managed Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID / Azure Workload Identity
- Azure managed identities
- Azure Container Registry (ACR)
- Kubernetes RBAC
- Kubernetes Kustomize
- Azure CLI

## Sources Consulted
- Microsoft Learn: Overview of managed identities in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/managed-identity-overview
- Microsoft Learn: Use a system-assigned managed identity in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/system-assigned-managed-identity
- Microsoft Learn: Deploy and configure an AKS cluster with Microsoft Entra Workload ID - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Use Microsoft Entra Workload ID with Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Managed Identity authentication for Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity
- Microsoft Learn: az role assignment create reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Azure Workload Identity: Service account labels and annotations - https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html
- Flux documentation: Microsoft Azure integration - https://fluxcd.io/flux/integrations/azure/
- Flux documentation: OCIRepository - https://fluxcd.io/flux/components/source/ocirepositories/
- Flux documentation: flux bootstrap github - https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux documentation: Multi-tenancy and RBAC - https://fluxcd.io/flux/installation/configuration/multitenancy/

## Issues Found
- The ACR role assignment used the managed identity client ID with `az role assignment create --assignee`. Microsoft documentation recommends using the managed identity principal ID for role assignments, so the post now retrieves `principalId` and uses `USER_IDENTITY_PRINCIPAL_ID`.
- The workload identity patch only annotated ServiceAccounts. Flux and Azure Workload Identity documentation require the AKS workload identity label on the controller pod template so the mutating webhook injects the token volume and Azure environment variables. The post now adds Deployment patches for `source-controller` and `kustomize-controller`.
- The Flux Azure integration documentation shows `azure.workload.identity/tenant-id` alongside the client ID annotation for controller-level Workload Identity. The post now retrieves the managed identity tenant ID and includes the tenant annotation.
- The Kustomize patch example used one multi-resource patch file with a broad `kind: ServiceAccount` target. The post now uses separate patch files and explicit targets for each ServiceAccount and Deployment.
- The RBAC example claimed to limit Flux by binding a narrower role to the `kustomize-controller` service account. Flux installs controllers with broad permissions by default, so that binding would not constrain applies. The post now creates a separate `flux-deployer` service account and shows using `spec.serviceAccountName` on a Flux `Kustomization`.
- The bootstrap step said it installed Flux with managed identity configuration, but the shown command did not apply that configuration. The wording now states that managed identity configuration is applied in the following patch step.

## Review Notes
The `az` CLI was not installed in the local review environment, so CLI flag validation was performed against Microsoft Learn and Flux official documentation rather than local `az --help` output.
