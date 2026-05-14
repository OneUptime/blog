# Validation Summary: How to Configure Flux CD with Azure Active Directory Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Azure Kubernetes Service (AKS)
- Microsoft Entra ID / Azure Active Directory
- Azure CLI
- Azure RBAC
- Kubernetes RBAC
- Azure Workload Identity
- Microsoft Graph Conditional Access named locations
- Flux notification-controller

## Sources Consulted
- Microsoft Learn: Use Microsoft Entra ID authorization for the Kubernetes API in AKS - https://learn.microsoft.com/en-us/azure/aks/entra-id-authorization
- Microsoft Learn: Use Kubernetes RBAC with Microsoft Entra ID in AKS - https://learn.microsoft.com/en-us/azure/aks/kubernetes-rbac-entra-id
- Microsoft Learn: Enable Microsoft Entra ID authentication for the AKS control plane - https://learn.microsoft.com/en-gb/azure/aks/entra-id-control-plane-authentication
- Microsoft Learn: Deploy and configure an AKS cluster with Microsoft Entra Workload ID - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Use Microsoft Entra Workload ID with AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Flux documentation: Bootstrap for GitHub - https://fluxcd.io/flux/installation/bootstrap/github/
- Flux documentation: Azure integrations - https://fluxcd.io/flux/integrations/azure/
- Flux documentation: Workload Identity - https://fluxcd.io/flux/installation/configuration/workload-identity/
- Flux documentation: Notification providers - https://fluxcd.io/flux/components/notification/providers/
- Flux documentation: Notification alerts - https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes documentation: RBAC authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Microsoft Graph documentation: Create namedLocation - https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-post-namedlocations
- Microsoft Entra documentation: Conditional Access network signals - https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-assignment-network

## Issues Found
- The original guide enabled Azure RBAC for Kubernetes authorization while also relying on Kubernetes RBAC RoleBindings for Flux CRDs. I changed the cluster setup to use Microsoft Entra authentication with Kubernetes RBAC and changed the Azure role assignments to `Azure Kubernetes Service Cluster User Role`, so Azure RBAC is used for kubeconfig access and Kubernetes RBAC controls Flux resource access.
- The developer Role attempted to "prevent" deletes by adding a separate `delete` rule. Kubernetes RBAC is additive and has no deny rules, so that rule actually granted delete permission. I removed the delete rule.
- The dev namespace was referenced before being created. I added `kubectl create namespace dev` before the namespace-scoped Role and RoleBinding.
- The GitHub bootstrap example omitted `--token-auth` while showing the token-based GitHub bootstrap flow. I added the flag to match Flux's documented GitHub bootstrap behavior.
- The GitHub bootstrap command used `--personal` while the owner placeholder referred to a GitHub organization. I removed `--personal` so the command matches an organization-owned repository.
- The managed identity section created a federated credential but did not enable AKS OIDC/workload identity or patch the Flux source-controller ServiceAccount and Deployment. I added the required AKS flags and a Kustomize patch example with the Azure Workload Identity annotations and labels.
- The Conditional Access named location example used a private CIDR. Microsoft Entra named locations should use the public egress IP range seen by Microsoft Entra, so I changed the example to a documentation public CIDR placeholder.
- The notification manifests used `notification.toolkit.fluxcd.io/v1` for Provider and Alert, but current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for those resources. I updated both manifests.
- The notification section claimed Azure AD-secured webhook authentication, but the Flux generic provider supports webhook token-style authentication rather than acquiring Microsoft Entra tokens for the call. I reworded it to a secured webhook endpoint.

## Review Notes
The guide now uses a consistent Entra-authenticated AKS plus Kubernetes RBAC model. In a production environment, teams should decide explicitly between Kubernetes RBAC and AKS Azure RBAC authorization; if AKS Azure RBAC authorization is enabled, Flux CRD access should be handled with appropriate Azure custom roles or ABAC conditions rather than the Kubernetes RBAC bindings shown here.
