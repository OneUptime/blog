# Validation Summary: How to Configure Azure Key Vault with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Azure Key Vault
- Azure CLI (`az`)
- Kubernetes
- Helm
- External Secrets Operator (ESO)
- Secrets Store CSI Driver
- Azure Key Vault Provider for Secrets Store CSI Driver
- Azure Private Endpoints
- Azure service principals / RBAC

## Sources Consulted
- External Secrets Operator Azure Key Vault provider docs: https://external-secrets.io/latest/provider/azure-key-vault/
- External Secrets Operator getting started: https://external-secrets.io/latest/introduction/getting-started/
- Azure Key Vault Provider for Secrets Store CSI Driver installation docs: https://azure.github.io/secrets-store-csi-driver-provider-azure/docs/getting-started/installation/
- Azure secrets-store-csi-driver-provider-azure GitHub repo (verified `deployment/provider-azure-installer.yaml` exists): https://github.com/Azure/secrets-store-csi-driver-provider-azure
- Kubernetes SIGs Secrets Store CSI Driver Helm chart repo: https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
- Azure CLI reference for `az keyvault`, `az ad sp create-for-rbac`, `az network private-endpoint create`

## Issues Found
No technical issues found.

Verified:
- Azure CLI commands (`az group create`, `az keyvault create`, `az keyvault secret set`, `az ad sp create-for-rbac`, `az keyvault certificate import`, `az network private-endpoint create`) use correct subcommands and flags.
- The `"Key Vault Secrets User"` Azure built-in role is the correct role for read access to secrets via RBAC.
- ESO Helm chart name (`external-secrets/external-secrets`) and repo (`https://charts.external-secrets.io`) are correct.
- The ClusterSecretStore YAML with `provider.azurekv`, `tenantId`, `vaultUrl`, and `authSecretRef.{clientId,clientSecret}` matches the official ESO Azure KV provider schema, including required `namespace` field in secret refs for a cluster-scoped store.
- ExternalSecret structure (refreshInterval, secretStoreRef, target.creationPolicy, data[].remoteRef.key) is valid.
- Secrets Store CSI Driver Helm chart name (`csi-secrets-store/secrets-store-csi-driver`) and settings (`syncSecret.enabled`, `enableSecretRotation`, `rotationPollInterval`) are valid.
- Azure provider install URL (`https://raw.githubusercontent.com/Azure/secrets-store-csi-driver-provider-azure/master/deployment/provider-azure-installer.yaml`) is a valid alternative install path documented by the Azure project.
- SecretProviderClass apiVersion `secrets-store.csi.x-k8s.io/v1` and `provider: azure` parameters (`usePodIdentity`, `keyvaultName`, `tenantId`, `objects`, `secretObjects`) match the documented schema.
- Deployment volume CSI driver name `secrets-store.csi.k8s.io` is the correct registered driver name.
- TLS certificate ExternalSecret using `property: certificate` and `property: privatekey` is the standard ESO Azure KV pattern for pulling PFX certificates as `kubernetes.io/tls` secrets.
- Azure private endpoint command structure (`--group-id vault`, `--private-connection-resource-id`) is correct for Key Vault.

## Review Notes
- The post uses `external-secrets.io/v1beta1` for both `ClusterSecretStore` and `ExternalSecret`. As of recent ESO releases, `v1` is the GA API version. `v1beta1` still works (and many existing installations use it), so this is not technically incorrect, but readers starting from scratch may want to use `v1`.
- `--set installCRDs=true` for the ESO Helm install is redundant — CRD installation is the default behavior of the chart — but harmless.
- The Azure CSI provider install is documented officially as both a Helm chart (`csi-secrets-store-provider-azure/csi-secrets-store-provider-azure`) and the raw YAML URL used in the post. The Helm method is the project's preferred approach for better version pinning, but the kubectl-apply method shown will work.
- The post correctly notes that classic Talos Linux deployments (non-AKS) need a service principal because they cannot use AKS-managed identity or Azure Workload Identity without additional setup. For users on Talos clusters where Azure Workload Identity is desired, additional OIDC issuer configuration would be required — out of scope for this post.
