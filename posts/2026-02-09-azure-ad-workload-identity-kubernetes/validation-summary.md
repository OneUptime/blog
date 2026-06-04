# Validation Summary: How to Implement Azure AD Workload Identity for Kubernetes Pods

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Microsoft Entra Workload ID / Azure AD Workload Identity
- Kubernetes service accounts and pod labels
- Azure CLI
- kubectl
- Helm
- Azure managed identities and federated identity credentials
- Azure RBAC
- Azure Storage and Key Vault
- Azure SDK for Python

## Sources Consulted
- Microsoft Learn: Deploy and configure an AKS cluster with Microsoft Entra Workload ID: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Use Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Azure Workload Identity documentation: Mutating admission webhook installation: https://azure.github.io/azure-workload-identity/docs/installation/mutating-admission-webhook.html
- Azure Workload Identity documentation: Installation overview: https://azure.github.io/azure-workload-identity/docs/installation.html
- Microsoft Learn: Azure role assignments with Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: az role assignment CLI reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Kubernetes documentation: kubectl run generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Microsoft Learn: Azure Monitor diagnostic settings for Azure Storage: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/resource-manager-diagnostic-settings
- Microsoft Learn: Microsoft Entra sign-in log activity details: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details
- Microsoft Learn: Azure Identity WorkloadIdentityCredential for Python: https://learn.microsoft.com/en-us/python/api/azure-identity/azure.identity.aio.workloadidentitycredential
- Microsoft Learn: Use Microsoft Entra pod-managed identities in AKS: https://learn.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity

## Issues Found
- The post assigned Azure RBAC roles using the managed identity client ID. Microsoft recommends using the managed identity principal/object ID with `--assignee-object-id` and `--assignee-principal-type ServicePrincipal`, especially for newly created identities. Updated the primary and read-only role assignment examples.
- The service account examples labeled the ServiceAccount with `azure.workload.identity/use: "true"` and stated that this label triggers webhook injection. Current AKS documentation requires this label on the pod template, not the ServiceAccount. Removed the ServiceAccount label and corrected the explanation.
- The deployment manifest set `AZURE_CLIENT_ID` manually to `YOUR_CLIENT_ID`, but the workload identity webhook injects `AZURE_CLIENT_ID` from the annotated ServiceAccount. Removed the placeholder environment variable and added `AZURE_CLIENT_ID` to the injected variable list.
- The `kubectl run` test pod used `--serviceaccount`, which is not present in the current official `kubectl run` generated reference. Replaced it with a JSON `--overrides` value that sets `spec.serviceAccountName`.
- The commands applied objects into the `production` namespace without first ensuring the namespace exists. Added an idempotent namespace creation command before applying the ServiceAccount.
- The read-only managed identity creation omitted `--location`; the primary managed identity example included it and Azure managed identity examples require a location. Added `--location eastus`.
- The monitoring section described `az monitor activity-log list` as querying identity sign-in logs. Activity logs are resource operation logs, while managed identity authentication events are in Microsoft Entra sign-in logs. Updated the wording and added a note to review Entra sign-in logs separately.
- The storage diagnostic settings example targeted the storage account resource ID for `StorageRead` logs. Azure Storage resource logs are configured on service resources such as `blobServices/default`. Updated the resource ID accordingly.
- The migration section omitted the required namespace for `az aks pod-identity delete` and referenced an incorrect old pod identity label. Added `--namespace production` and changed the old label reference to `aadpodidbinding`.

## Review Notes
The tutorial remains technically valid after the fixes. Official Microsoft documentation now uses the Microsoft Entra naming, while the Azure Workload Identity project and many existing materials still use Azure AD terminology; the title is understandable but could be renamed in the future for current branding consistency.
