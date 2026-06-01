# Validation Summary: How to Integrate Azure Key Vault Secrets with AKS Pods Using CSI Driver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Key Vault
- Secrets Store CSI Driver
- Azure Key Vault provider for Secrets Store CSI Driver
- Microsoft Entra Workload ID
- Kubernetes ServiceAccounts, Deployments, Secrets, and CSI volumes
- Azure CLI

## Sources Consulted
- Microsoft Learn: Use the Azure Key Vault provider for Secrets Store CSI Driver in AKS: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- Microsoft Learn: Connect your Azure identity provider to the Azure Key Vault Secrets Store CSI Driver in AKS: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Microsoft Learn: Use Microsoft Entra Workload ID with AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Deploy and configure an AKS cluster with Microsoft Entra Workload ID: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn Azure CLI reference: az aks addon update: https://learn.microsoft.com/en-us/cli/azure/aks/addon
- Azure Workload Identity documentation: Service account labels and annotations: https://azure.github.io/azure-workload-identity/docs/topics/service-account-labels-and-annotations.html
- Secrets Store CSI Driver documentation: Sync as Kubernetes Secret: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- Secrets Store CSI Driver documentation: Set as ENV var: https://secrets-store-csi-driver.sigs.k8s.io/topics/set-as-env-var
- Secrets Store CSI Driver documentation: Auto rotation of mounted contents and synced Kubernetes Secrets: https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation

## Issues Found
- The prerequisites listed Azure CLI 2.40+ and Kubernetes 1.24+. Microsoft documents Azure CLI 2.47.0+ and AKS 1.22+ for Microsoft Entra Workload ID, so the prerequisite versions were corrected.
- The ServiceAccount manifest placed `azure.workload.identity/use: "true"` on the ServiceAccount. That label is required on the workload pod template so the workload identity webhook mutates the pod. The label was removed from the ServiceAccount example and added to the Deployment pod template.

## Review Notes
The SecretProviderClass fields, Key Vault role assignment guidance for secrets, CSI volume configuration, Kubernetes Secret sync behavior, and rotation notes align with the consulted documentation. The local environment did not have Azure CLI installed, so Azure CLI syntax was verified against Microsoft Learn rather than local `az --help` output.
