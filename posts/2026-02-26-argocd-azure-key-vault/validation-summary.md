# Validation Summary: How to Use ArgoCD with Azure Key Vault

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- External Secrets Operator
- Azure Key Vault
- Secrets Store CSI Driver
- Azure Key Vault Provider for Secrets Store CSI Driver
- Kubernetes Secrets, Deployments, ServiceAccounts, and CSI volumes
- Microsoft Entra Workload ID

## Sources Consulted
- External Secrets Operator Azure Key Vault provider documentation: https://external-secrets.io/v0.19.0/provider/azure-key-vault/
- External Secrets Operator Helm chart index: https://charts.external-secrets.io/index.yaml
- Secrets Store CSI Driver concepts documentation: https://secrets-store-csi-driver.sigs.k8s.io/concepts.html
- Secrets Store CSI Driver sync-as-Kubernetes-Secret documentation: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- Secrets Store CSI Driver secret auto-rotation documentation: https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation
- Secrets Store CSI Driver Helm chart index: https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts/index.yaml
- Azure Key Vault Provider for Secrets Store CSI Driver identity access documentation: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Azure Key Vault Provider Helm chart index: https://azure.github.io/secrets-store-csi-driver-provider-azure/charts/index.yaml
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/

## Issues Found
- The External Secrets Operator examples used `external-secrets.io/v1beta1`, which is deprecated in current ESO releases. Updated the `ClusterSecretStore` and `ExternalSecret` examples to `external-secrets.io/v1`.
- The ESO Helm chart version range was pinned to the older `0.9.x` line. Updated it to `2.x` based on the current official chart index.
- The ESO workload identity SecretStore referenced a service account but did not show the required annotated service account. Added the `external-secrets-sa` ServiceAccount with Azure workload identity annotations.
- The Secrets Store CSI Driver chart version range was pinned to the older `1.4.x` line. Updated it to `1.6.x` based on the current official chart index.
- The Azure provider chart version range was pinned to the older `1.5.x` line. Updated it to `1.8.x` based on the current official chart index.
- The CSI Driver comparison mentioned rotation, but the Helm values did not enable secret rotation. Added `enableSecretRotation: true` and `rotationPollInterval: 5m`.
- The workload identity SecretProviderClass example included `useVMManagedIdentity: "false"`, which is not part of the current Microsoft workload identity example. Removed it.
- The CSI workload identity deployment did not use an annotated service account or the `azure.workload.identity/use: "true"` pod label. Added the `my-app-sa` ServiceAccount, the pod label, and `serviceAccountName: my-app-sa`.

## Review Notes
The CSI Driver example enables Kubernetes Secret sync support at the driver level, but it still does not create Kubernetes Secret objects unless `secretObjects` is also configured in a `SecretProviderClass`. The post's no-Kubernetes-Secret CSI example remains accurate because no `secretObjects` are defined.
