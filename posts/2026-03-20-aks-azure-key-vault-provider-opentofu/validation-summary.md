# Validation Summary: How to Set Up AKS with Azure Key Vault Provider Using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Kubernetes Service (AKS)
- Azure Key Vault
- Secrets Store CSI Driver
- Microsoft Entra Workload ID / AKS Workload Identity
- Kubernetes manifests
- Azure CLI
- `kubectl`

## Sources Consulted
- Azure AKS: Use the Azure Key Vault provider for Secrets Store CSI Driver in an AKS cluster: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- Azure AKS: Azure Key Vault provider for Secrets Store CSI Driver configuration options: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-configuration-options
- Azure AKS: Access Azure Key Vault with the CSI Driver Identity Provider: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Azure AKS: Use a Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Azure AKS: Supported Kubernetes versions in AKS: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Azure CLI reference for `az aks get-credentials`: https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest#az-aks-get-credentials
- Terraform Registry: `azurerm_kubernetes_cluster`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Terraform Registry: `azurerm_federated_identity_credential`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential
- Terraform Registry: `azurerm_key_vault_secret`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret
- Kubernetes documentation: Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Secrets Store CSI Driver documentation: Concepts: https://secrets-store-csi-driver.sigs.k8s.io/concepts.html
- Secrets Store CSI Driver documentation: Secret Auto Rotation: https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation.html

## Issues Found
- The OpenTofu example was not self-contained: it omitted the `terraform`/provider configuration and all referenced input variable declarations. I added the AzureRM provider block and the required variables so `tofu init` and `tofu plan` can work as written.
- The cluster configuration pinned `kubernetes_version = "1.28"`, which is no longer a supported AKS version. I removed the hardcoded version so AzureRM can provision the latest recommended supported version at apply time.
- The Kubernetes manifests used the `production` namespace but never created it. I added a namespace manifest and an explicit `kubectl apply -f kubernetes/00-namespace.yaml` step before applying the rest of the manifests.
- The deployment instructions used `kubectl describe secretproviderclass` as a status check. I changed that to `kubectl get secretproviderclasspodstatus -n production`, which is the CSI driver's status resource for tracking pod mounts and loaded object versions.
- The post overstated when pod restarts are required after rotation. I corrected the explanation to match the official behavior: mounted files and synced Secret volumes update automatically, while environment-variable consumers still need a pod restart.
- The introduction/description implied secrets are never stored in etcd, which is only true when they are consumed purely as mounted files. I qualified that language because the post also shows optional sync to a Kubernetes Secret.

## Review Notes
- The example still creates Key Vault secrets with `azurerm_key_vault_secret.value`, which stores the secret value in OpenTofu state according to the provider docs. This is technically valid, but state handling should be treated as sensitive.
