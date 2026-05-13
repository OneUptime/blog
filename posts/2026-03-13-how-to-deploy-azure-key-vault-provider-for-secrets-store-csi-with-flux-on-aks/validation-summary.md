# Validation Summary: How to Deploy Azure Key Vault Provider for Secrets Store CSI with Flux on AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Key Vault
- Secrets Store CSI Driver
- Azure Key Vault Provider for Secrets Store CSI Driver
- Microsoft Entra Workload ID
- Azure CLI
- Kubernetes manifests
- Flux HelmRelease, HelmRepository, and Kustomization resources
- Helm charts

## Sources Consulted
- Microsoft Learn: Use the Azure Key Vault provider for Secrets Store CSI Driver in AKS - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- Microsoft Learn: Provide an identity to access the Azure Key Vault provider for Secrets Store CSI Driver in AKS - https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Microsoft Learn: az identity federated-credential - https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Microsoft Learn: az role assignment - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Secrets Store CSI Driver: Installation - https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation
- Secrets Store CSI Driver: Secret auto rotation - https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation
- Secrets Store CSI Driver: Sync as Kubernetes Secret - https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- Secrets Store CSI Driver: Set as ENV var - https://secrets-store-csi-driver.sigs.k8s.io/topics/set-as-env-var
- Azure Workload Identity: Service account labels and annotations - https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html
- Flux Helm API reference v2 - https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomize API reference v1 - https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Source API reference v1 - https://fluxcd.io/flux/components/source/api/v1/
- Secrets Store CSI Driver Helm chart index - https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts/index.yaml
- Azure Key Vault provider Helm chart index - https://azure.github.io/secrets-store-csi-driver-provider-azure/charts/index.yaml

## Issues Found
- The add-on and Helm installation paths were ambiguous. The post now clarifies that users should skip the AKS add-on command when managing the driver through Flux and Helm, avoiding two competing installations.
- The Secrets Store CSI Driver chart version constraint used `1.4.*`, which is outdated. It was updated to `1.5.*`, matching a current chart series that remains broadly compatible with AKS clusters.
- The Azure Key Vault provider chart version constraint used `1.5.*`, which is outdated. It was updated to `1.8.*`, matching the current provider chart series in the official chart index.
- The Key Vault permission command used `az keyvault set-policy`, but current Microsoft guidance for RBAC-enabled vaults uses Azure RBAC role assignments. The command was changed to assign `Key Vault Secrets User` at the Key Vault scope.
- The federated credential command used `--audience`, but the current Azure CLI parameter is `--audiences`. The command was corrected.
- The `azure.workload.identity/use: "true"` label was placed on the ServiceAccount. Azure Workload Identity requires this label on the pod template. The label was moved to the Deployment pod template metadata.

## Review Notes
- The post correctly notes that synced Kubernetes Secrets are only created after a pod mounts the SecretProviderClass.
- Environment variables populated from Kubernetes Secrets do not update inside a running container when the synced Secret rotates; pods need to be restarted or reloaded for environment variable changes to take effect. Mounted files are updated by the CSI driver rotation flow.
- Secrets Store CSI Driver 1.6.0 is available but requires Kubernetes 1.30 or later according to the official chart index. The post now uses the 1.5 chart series to avoid narrowing the guide to only AKS clusters on Kubernetes 1.30+.
