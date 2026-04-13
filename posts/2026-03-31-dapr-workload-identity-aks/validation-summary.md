# Validation Summary: How to Use Dapr with Workload Identity Federation on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar runtime, secret store component)
- Azure Kubernetes Service (AKS)
- Azure Workload Identity Federation
- Microsoft Entra ID (formerly Azure AD)
- Azure Key Vault
- Azure Managed Identity
- Azure CLI

## Sources Consulted
- Dapr Azure Key Vault secret store reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr Workload Identity Federation how-to: https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/howto-wif/
- Dapr Azure authentication overview: https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/authenticating-azure/
- Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Migrate from Pod Identity to Workload ID: https://learn.microsoft.com/en-us/azure/aks/workload-identity-migrate-from-pod-identity
- Azure AD renamed to Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/fundamentals/new-name
- az identity federated-credential CLI reference: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential

## Issues Found
1. **"formerly Pod Identity" was inaccurate.** Azure Workload Identity is architecturally distinct from AAD Pod Identity (which used NMI DaemonSets and CRDs). It is the successor/replacement, not a rename. Changed "(formerly Pod Identity)" to "(the successor to AAD Pod Identity)".

2. **"Azure AD" is an outdated name.** Azure Active Directory was officially renamed to Microsoft Entra ID in July 2023. Updated the reference from "Azure AD" to "Microsoft Entra ID".

3. **Dapr component included unnecessary `azureClientId` field.** Per official Dapr documentation, when using Workload Identity Federation, `azureClientId` is not necessary and has no effect -- Dapr leverages the Kubernetes service account to authenticate transparently. Removed the `azureClientId` metadata entry from the component configuration, leaving only the required `vaultName` field.

## Review Notes
- All Azure CLI commands (`az aks update`, `az identity create`, `az identity federated-credential create`, `az role assignment create`) were verified correct with proper flags and syntax.
- The Kubernetes ServiceAccount annotation (`azure.workload.identity/client-id`), pod label (`azure.workload.identity/use: "true"`), and federated credential subject format (`system:serviceaccount:NAMESPACE:NAME`) are all correct.
- The Dapr secrets API endpoint (`/v1.0/secrets/azure-keyvault/my-secret`) and sidecar container name (`daprd`) are correct.
- The audience value `api://AzureADTokenExchange` is the standard audience for Azure Workload Identity Federation.
