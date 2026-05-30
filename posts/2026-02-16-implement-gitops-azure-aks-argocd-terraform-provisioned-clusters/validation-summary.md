# Validation Summary: How to Use GitOps for Azure AKS with ArgoCD and Terraform-Provisioned Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Terraform
- HashiCorp AzureRM provider
- HashiCorp Helm provider
- HashiCorp Kubernetes provider
- Argo CD
- Kubernetes manifests
- Prometheus Operator ServiceMonitor
- GitOps workflows

## Sources Consulted
- Microsoft Learn: Supported Kubernetes versions in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Deploy and configure an AKS cluster with Microsoft Entra Workload ID: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: AKS legacy Container Networking Interfaces: https://learn.microsoft.com/en-us/azure/aks/concepts-network-legacy-cni
- Terraform Registry: AzureRM `azurerm_kubernetes_cluster`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Terraform Registry: AzureRM `azurerm_kubernetes_cluster_node_pool`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool
- Terraform Registry: Helm `helm_release`: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Registry: Kubernetes `kubernetes_manifest`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- The AKS Terraform snippet referenced `var.admin_group_id` without defining it. Added a string variable for the Microsoft Entra admin group object ID.
- The AKS Terraform snippet referenced `azurerm_subnet.aks.id` without defining a virtual network or subnet. Added matching `azurerm_virtual_network` and `azurerm_subnet` resources.
- The AKS example pinned Kubernetes `1.28`, which is no longer a regular supported AKS version as of the validation date. Updated it to `1.35`, which is listed in the current AKS support table.
- The AzureRM AKS configuration used the older `managed = true` property inside `azure_active_directory_role_based_access_control`. Removed it and explicitly set `role_based_access_control_enabled = true` with Azure RBAC enabled.
- The AKS availability zones were written as numbers. Updated them to strings to match the Terraform provider schema and examples.
- The `kube_config` output returned `kube_config_raw`, but the downstream Helm and Kubernetes provider examples indexed it as the structured `kube_config` block. Changed the output to `azurerm_kubernetes_cluster.main.kube_config`.
- The Argo CD ingress example used the deprecated `kubernetes.io/ingress.class` annotation pattern. Replaced it with `ingressClassName` in the Helm values.
- The ServiceMonitor example selected `app.kubernetes.io/name: argocd-server`, but Argo CD documents API server metrics on the `argocd-server-metrics` service. Updated the ServiceMonitor name and selector to `argocd-server-metrics`.

## Review Notes
The examples are technically valid as illustrative Terraform and Kubernetes snippets, but a production implementation should still add subnet role assignments, ingress controller installation, DNS and TLS configuration, state backend bootstrapping, and private repository authentication where required.
