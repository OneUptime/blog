# Validation Summary: How to Build a Production-Ready AKS Cluster on Azure with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Azure Kubernetes Service (AKS)
- Azure Resource Manager (`azurerm` provider)
- Microsoft Entra ID and Azure RBAC for Kubernetes authorization
- Microsoft Entra Workload ID / OIDC issuer
- Azure Monitor / Log Analytics
- Azure Container Registry (ACR)
- AKS node pools and cluster autoscaling
- Azure CNI and AKS network policies

## Sources Consulted
- AzureRM `azurerm_kubernetes_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- AzureRM `azurerm_kubernetes_cluster_node_pool` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool
- AzureRM `azurerm_container_registry` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry
- AzureRM `azurerm_log_analytics_workspace` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace
- AzureRM `azurerm_role_assignment` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Manage local accounts with AKS-managed Microsoft Entra integration: https://learn.microsoft.com/en-us/azure/aks/manage-local-accounts-managed-azure-ad
- Use Azure RBAC for Kubernetes authorization: https://learn.microsoft.com/en-us/azure/aks/manage-azure-rbac
- Use Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Use Microsoft Entra pod-managed identities in AKS: https://learn.microsoft.com/en-us/azure/aks/use-azure-ad-pod-identity
- Use planned maintenance to schedule and control upgrades for AKS clusters: https://learn.microsoft.com/en-us/azure/aks/planned-maintenance
- AKS patch and upgrade guidance: https://learn.microsoft.com/en-us/azure/architecture/operator-guides/aks/aks-upgrade-practices
- AKS IP address planning: https://learn.microsoft.com/en-us/azure/aks/concepts-network-ip-address-planning
- Troubleshoot `ServiceCidrOverlapExistingSubnetsCidr` errors in AKS: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/error-codes/servicecidroverlapexistingsubnetscidr-error

## Issues Found
- The Terraform examples used the outdated `enable_auto_scaling` argument. Updated all node pool blocks to `auto_scaling_enabled`, which matches the current AzureRM provider schema.
- The AKS Microsoft Entra block included `managed = true`, which is no longer part of the current `azure_active_directory_role_based_access_control` schema. Removed it and kept the supported fields.
- The cluster defined `maintenance_window_auto_upgrade` but did not configure an AKS automatic upgrade channel, so the example did not actually enable scheduled Kubernetes upgrades. Added `automatic_upgrade_channel = "stable"` and updated the surrounding explanation accordingly.
- The original `service_cidr` (`10.96.0.0/16`) overlapped the VNet address space (`10.0.0.0/8`). Changed the service CIDR and DNS service IP to a non-overlapping `172.20.0.0/16` range.
- The monitoring block referenced `azurerm_log_analytics_workspace.aks.id`, but the post did not define that workspace. Added a minimal `azurerm_log_analytics_workspace` resource so the example is internally consistent.
- The ACR pull role assignment omitted `skip_service_principal_aad_check`, which the current provider example uses for kubelet identity role assignments to avoid Microsoft Entra replication timing issues. Added it.
- The text referred to "pod identity or Workload Identity" and "Azure AD". Updated the wording to current Microsoft Entra / Workload Identity terminology because pod-managed identity is deprecated and Workload Identity is the recommended replacement.

## Review Notes
- AKS documentation now recommends Azure CNI Powered by Cilium for many new deployments. The example's `network_policy = "azure"` configuration is still supported, but it is not the current preferred recommendation for scale and feature coverage.
- The post does not pin an AzureRM provider version. Validation was performed against the current AzureRM 4.x documentation available on 2026-04-24.
- The ACR resource name still depends on `var.environment` being lowercase alphanumeric to satisfy Azure naming rules.
