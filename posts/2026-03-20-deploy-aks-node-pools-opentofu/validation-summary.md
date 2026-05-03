# Validation Summary: How to Deploy AKS with Node Pools Using OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- AzureRM provider (v4.x)
- Azure Kubernetes Service (AKS)
- Azure user-assigned managed identities
- Kubernetes node pools (system, user, spot, GPU)
- Azure CNI networking, Calico network policy
- Azure RBAC for Kubernetes / Microsoft Entra ID
- Azure Monitor / Log Analytics (oms_agent)
- Azure VM SKUs (Dsv3, NCv3 GPU)

## Sources Consulted
- [AzureRM Provider 4.0 Upgrade Guide](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide) - confirmed v3 → v4 renames and removed properties for AKS resources
- [azurerm_kubernetes_cluster resource](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster)
- [azurerm_kubernetes_cluster_node_pool resource](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool)
- Raw upgrade guide markdown from `hashicorp/terraform-provider-azurerm` `main` branch (`website/docs/guides/4.0-upgrade-guide.html.markdown`)
- Microsoft Learn: AKS cluster autoscaler, AKS support policies, Azure VM size families (Dsv3, NCv3)

## Issues Found

1. **Deprecated `enable_auto_scaling` argument (4 occurrences)** — In AzureRM provider v4.x the property was renamed from `enable_auto_scaling` to `auto_scaling_enabled` on both `azurerm_kubernetes_cluster.default_node_pool` and `azurerm_kubernetes_cluster_node_pool`. The old name has been removed and configurations using it will fail to plan against current providers. Renamed all four occurrences (system, general, spot, gpu pools) to `auto_scaling_enabled` and re-aligned the surrounding indentation.

2. **Removed `managed` argument in `azure_active_directory_role_based_access_control`** — In v4.x the deprecated `managed` property was removed because the resource only supports the managed Azure AD integration now. Setting `managed = true` produces an "unsupported argument" error. Removed the line; the remaining `azure_rbac_enabled` and `admin_group_object_ids` arguments are still valid.

## Review Notes

- The `dns_service_ip` of `10.96.0.10` lies inside `service_cidr` `10.96.0.0/16`, satisfying the AKS requirement that the DNS service IP be within the service CIDR.
- `os_disk_size_gb = 50` with `os_disk_type = "Ephemeral"` on `Standard_D2s_v3` is at the upper bound — D2s_v3 has a 50 GiB cache, so it just fits. Sizing with no headroom can be fragile if Microsoft reports cache size differently in some regions; readers may want to pick D4s_v3 or smaller disks if they hit "ephemeral OS disk doesn't fit" provisioning errors.
- The role assignment comment says "Grant the cluster identity access to the node resource group" but the scope is the AKS resource group itself, not the auto-created `MC_*` node resource group (which AKS manages on its own). The configuration is still valid and sometimes useful (e.g. if the identity needs to manage other resources in the parent RG), so this is left as-is — it's a comment/wording nuance rather than a technical error.
- `Standard_NC6s_v3` is being retired by Azure in favour of newer GPU SKUs (NCads_H100_v5, NC_A100_v4, etc.); readers deploying new GPU pools today may want a more current SKU, but the example is still syntactically correct.
- The post does not pin a provider version in a `required_providers` block. As written, the configuration targets AzureRM v4.x (after the fixes above). Adding a `version = "~> 4.0"` constraint would make the example more reproducible, but this is a stylistic improvement rather than a correctness fix.
