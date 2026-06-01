# Validation Summary: How to Configure Azure AD RBAC for AKS Cluster Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Microsoft Entra ID / Azure AD authentication
- Azure RBAC for Kubernetes authorization
- Kubernetes RBAC
- Microsoft Entra Conditional Access
- Azure CLI
- Microsoft Graph Conditional Access policy JSON
- kubelogin

## Sources Consulted
- Microsoft Learn: Enable Microsoft Entra ID authentication for the AKS control plane: https://learn.microsoft.com/en-us/azure/aks/entra-id-control-plane-authentication
- Microsoft Learn: Use Microsoft Entra ID authorization for the Kubernetes API in AKS: https://learn.microsoft.com/en-us/azure/aks/entra-id-authorization
- Microsoft Learn: Cluster authentication concepts in AKS: https://learn.microsoft.com/en-us/azure/aks/concepts-cluster-authentication
- Microsoft Learn: Cluster authorization concepts in AKS: https://learn.microsoft.com/en-us/azure/aks/concepts-cluster-authorization
- Microsoft Learn: Use Kubernetes RBAC with Microsoft Entra ID in AKS: https://learn.microsoft.com/en-us/azure/aks/kubernetes-rbac-entra-id
- Microsoft Learn: Control cluster and node access using Conditional Access with Microsoft Entra integration: https://learn.microsoft.com/en-us/azure/aks/access-control-managed-azure-ad
- Microsoft Learn: Use kubelogin to authenticate in AKS: https://learn.microsoft.com/en-us/azure/aks/kubelogin-authentication
- Microsoft Graph: conditionalAccessUsers resource type: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessusers
- Microsoft Graph: conditionalAccessGrantControls resource type: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessgrantcontrols
- Microsoft Graph: conditionalAccessLocations resource type: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesslocations
- Microsoft Learn: View applied Conditional Access details in Microsoft Entra activity logs: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies
- Microsoft Learn REST API: Managed Clusters - List Cluster User Credentials: https://learn.microsoft.com/en-us/rest/api/aks/managed-clusters/list-cluster-user-credentials

## Issues Found
- The existing-cluster update command enabled Microsoft Entra authentication but did not enable Azure RBAC authorization, while the following section assigns Azure Kubernetes Service RBAC roles. Added `--enable-azure-rbac` to the update command.
- The authentication sequence described kubectl as always using device code flow. Current AKS clusters use kubelogin exec format, and device code authentication is not compatible with Conditional Access policies. Updated the flow and Step 5 wording to reference kubelogin/Azure CLI prompts and the Conditional Access limitation.
- The Conditional Access example called the AKS GUID a client app ID. Microsoft documentation targets the Azure Kubernetes Service Microsoft Entra Server application for control-plane access. Updated the wording to server app ID.
- The Graph JSON example for all users used `includeAll: true`, which is not a valid `conditionalAccessUsers` field. Replaced it with `includeUsers: ["All"]` and added the same break-glass group exclusion used in the MFA policy.
- The audit section described an Azure Activity Log query as viewing sign-in logs. Clarified that Microsoft Entra sign-in logs record authentication and Azure Activity Logs record management-plane kubeconfig retrieval actions.
- The break-glass guidance implied that a Conditional Access exclusion handles Azure AD service issues. Updated it to distinguish policy lockout recovery from Microsoft Entra authentication unavailability and documented the local-account re-enable path.

## Review Notes
- Microsoft now uses the name Microsoft Entra ID, but the post's use of Azure AD remains understandable for a compatibility-oriented article.
- The workspace does not have Azure CLI installed, so CLI flags were verified against current Microsoft Learn documentation rather than local `az --help` output.
