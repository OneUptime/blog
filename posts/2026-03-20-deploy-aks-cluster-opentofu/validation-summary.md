# Validation Summary: How to Deploy an AKS Cluster with OpenTofu on Azure - Deploy

## Status
validated

## Post Type
Tutorial / Guide (Infrastructure as Code)

## Technologies Covered
- OpenTofu / Terraform (HCL2 syntax)
- Terraform AzureRM provider (v4.x)
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Azure RBAC and Azure AD integration
- Azure Monitor / Log Analytics (oms_agent)
- Workload Identity / OIDC issuer

## Sources Consulted
- Terraform AzureRM provider docs - `azurerm_kubernetes_cluster`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Terraform AzureRM provider docs - `azurerm_kubernetes_cluster_node_pool`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool
- Terraform AzureRM provider docs - `azurerm_role_assignment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- AzureRM v4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- HCL2 native syntax spec: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md

## Issues Found
1. **Deprecated `enable_auto_scaling` argument (default_node_pool)**: In AzureRM provider v4.0 this was renamed to `auto_scaling_enabled`. Updated the `default_node_pool` block accordingly.
2. **Deprecated `enable_auto_scaling` argument (azurerm_kubernetes_cluster_node_pool)**: Same rename in v4.0. Updated the `apps` node pool to use `auto_scaling_enabled`.
3. **Removed `managed` argument**: The `managed` property of `azure_active_directory_role_based_access_control` was removed in AzureRM v4.0 (managed AAD integration is now the only supported mode). Removed the `managed = true` line; the remaining `azure_rbac_enabled` and `admin_group_object_ids` continue to function as intended.
4. **Invalid HCL2 output block syntax**: The `output "kube_config"` one-line block contained two attributes separated by a semicolon (`value = ...; sensitive = true`). HCL2 does not allow semicolons as attribute separators, and one-line blocks may contain at most one attribute. Rewrote all four output blocks in standard multi-line form, with `kube_config` containing both `value` and `sensitive` on separate lines.

## Review Notes
- The `kubernetes_version` is left as a variable, which is good — it lets readers pin to a supported AKS version (Azure deprecates older Kubernetes minor versions roughly every 4-6 months).
- `Standard_D2s_v3` is a reasonable system node pool size, but for production AKS, Microsoft recommends at least 4 vCPU / 8 GiB for the system pool to handle add-ons (CoreDNS, Konnectivity, metrics-server, OMS agent). Consumers may want to bump this when applying.
- `network_policy = "azure"` requires `network_plugin = "azure"` (CNI), which the snippet correctly pairs. Note that Azure also supports `cilium` as a network policy option in newer CNI overlay configurations.
- The ACR pull role assignment uses `skip_service_principal_aad_check = true`, which is the recommended pattern when granting role to a kubelet managed identity (avoids replication-lag failures). This is correct.
- `kube_config_raw` is correctly marked sensitive; it contains cluster credentials.
