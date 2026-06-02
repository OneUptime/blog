# Validation Summary: How to Set Up AKS with Azure Key Vault for TLS Ingress Certificate Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Key Vault
- Azure Key Vault Provider for Secrets Store CSI Driver
- Secrets Store CSI Driver
- Kubernetes SecretProviderClass
- Kubernetes TLS secrets
- NGINX Ingress Controller
- Azure CLI

## Sources Consulted
- Microsoft Learn: Use the Azure Key Vault provider for Secrets Store CSI Driver in AKS - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- Microsoft Learn: Azure Key Vault provider for Secrets Store CSI Driver configuration options - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-configuration-options
- Microsoft Learn: Connect your Azure identity provider to the Azure Key Vault Secrets Store CSI Driver in AKS - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Microsoft Learn: Set up Secrets Store CSI Driver to enable NGINX Ingress Controller with TLS on AKS - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-nginx-tls
- Microsoft Learn: Supported Kubernetes versions in AKS - https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: az keyvault certificate command reference - https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate
- Microsoft Learn: az keyvault set-policy command reference - https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Assign Azure roles using Azure CLI - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli

## Issues Found
- The prerequisites referenced Kubernetes 1.24 or later. Kubernetes 1.24 is no longer supported on AKS, so this was changed to require an AKS cluster running a supported Kubernetes version.
- The prerequisites required the `aks-preview` extension, but the documented AKS Key Vault Secrets Provider commands are available through the Azure CLI without that preview extension requirement. This was changed to require Azure CLI installed and signed in.
- The autorotation command used `az aks update`. Current Microsoft documentation uses `az aks addon update --addon azure-keyvault-secrets-provider` for enabling or changing rotation on an existing cluster. The command was updated.
- The Key Vault creation command did not enable Azure RBAC, but the next access example used Azure RBAC role assignments. The command now includes `--enable-rbac-authorization true` so the role assignment path is internally consistent.
- The role assignment examples used the managed identity client ID as the assignee. Microsoft RBAC guidance recommends using the managed identity object ID with `--assignee-object-id` and `--assignee-principal-type ServicePrincipal`, so the examples now retrieve and use `IDENTITY_OBJECT_ID`.
- The RBAC text implied `Key Vault Certificate User` is required for the TLS example. Because the SecretProviderClass uses `objectType: secret` to retrieve the certificate private key and certificate, `Key Vault Secrets User` is the required role; the certificate role is now described as needed only when using `objectType: cert`.
- The access policy example used `--spn` with the client ID. This was changed to `--object-id $IDENTITY_OBJECT_ID`, matching Microsoft guidance for managed identities.
- The placeholder sync pod used `sleep infinity`, which is less portable across BusyBox variants. It now uses `sleep 10000`, matching the style used in Microsoft examples for a long-running test pod.

## Review Notes
The SecretProviderClass TLS mapping, use of `objectType: secret` for retrieving both private key and certificate material, requirement that a pod mount the SecretProviderClass before synced Kubernetes secrets are created, and default two-minute rotation interval all match Microsoft documentation. In production, users should verify their Key Vault networking rules allow AKS nodes to reach the vault and should confirm their ingress controller reload behavior for secret updates.
