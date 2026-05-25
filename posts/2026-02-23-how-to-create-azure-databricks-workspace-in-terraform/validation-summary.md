# Validation Summary: How to Create Azure Databricks Workspace in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AzureRM Terraform provider
- Databricks Terraform provider
- Azure Databricks
- Azure Virtual Network and subnet delegation
- Azure Private Link and Private DNS
- Azure Monitor diagnostic settings
- Databricks cluster policies and clusters

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_databricks_workspace`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/databricks_workspace
- HashiCorp AzureRM provider documentation for `azurerm_subnet`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- Databricks Terraform provider documentation for Azure workspace provisioning: https://registry.terraform.io/providers/databricks/databricks/latest/docs/guides/azure-workspace
- Databricks Terraform provider documentation for Azure Private Link workspace deployment: https://registry.terraform.io/providers/databricks/databricks/latest/docs/guides/azure-private-link-workspace-simplified
- Databricks Terraform provider documentation for `databricks_cluster` and `databricks_cluster_policy`: https://registry.terraform.io/providers/databricks/databricks/latest/docs/resources/cluster and https://registry.terraform.io/providers/databricks/databricks/latest/docs/resources/cluster_policy
- Databricks compute policy reference: https://docs.databricks.com/aws/en/admin/clusters/policy-definition
- Microsoft Learn Azure Databricks inbound Private Link documentation: https://learn.microsoft.com/en-us/azure/databricks/security/network/front-end/front-end-private-connect
- Microsoft Learn Azure Monitor supported logs for Microsoft.Databricks/workspaces: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-databricks-workspaces-logs
- Microsoft Learn Azure Databricks diagnostic log delivery: https://learn.microsoft.com/en-us/azure/databricks/admin/account-settings/audit-log-delivery
- Microsoft Learn Azure Private Endpoint network policy documentation: https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy

## Issues Found
- The Private Link example described private-only workspace access, but the workspace resource did not disable public network access. Added `public_network_access_enabled = false` and `network_security_group_rules_required = "NoAzureDatabricksRules"` to match AzureRM and Databricks Private Link guidance.
- The cluster policy constrained `num_workers`, but the example cluster uses an `autoscale` block. Replaced that policy rule with `autoscale.min_workers` and `autoscale.max_workers` rules so the policy applies to the cluster shape shown in the article.

## Review Notes
The examples are version-sensitive. The article pins AzureRM with `~> 3.80` and Databricks with `~> 1.30`, which remain plausible for the shown syntax, but future updates should consider moving to newer provider versions and rechecking changed arguments such as private endpoint network policy controls.
