# Validation Summary: How to Implement CIS Benchmark Controls with OpenTofu on Azure

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Azure Resource Manager (`azurerm` provider)
- Microsoft Defender for Cloud
- Azure Policy
- Microsoft Entra ID / Microsoft Graph
- Azure Storage and Private Link
- Azure SQL auditing
- Azure Monitor diagnostic settings
- Azure networking and NSGs

## Sources Consulted
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_subscription_pricing
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server_extended_auditing_policy
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group_policy_assignment
- https://learn.microsoft.com/en-us/entra/fundamentals/security-defaults
- https://learn.microsoft.com/en-us/entra/identity/conditional-access/plan-conditional-access
- https://learn.microsoft.com/en-us/azure/active-directory/manage-apps/configure-user-consent
- https://learn.microsoft.com/en-us/graph/api/resources/authorizationpolicy?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/activity-log-schema
- https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings

## Issues Found
- Section 1 originally used `azurerm_resource_group_policy_assignment` for app consent. That resource manages Azure Policy assignments, but user app consent is a tenant-level Microsoft Entra authorization policy setting. I replaced the incorrect resource example with accurate guidance to manage it through Entra ID / Microsoft Graph tooling.
- Section 1 originally implied Security Defaults required Microsoft Entra ID P1. Microsoft documents Security Defaults as available without P1/P2, while Conditional Access requires at least P1. I clarified that licensing distinction.
- The storage account example used `enable_https_traffic_only`, which was removed in `azurerm` v4 in favor of `https_traffic_only_enabled`. I updated the field name to the current provider argument.
- The private endpoint section claimed the storage account used private endpoints, but the example still allowed public network access and did not show private DNS association. I added `public_network_access_enabled = false` and a `private_dns_zone_group` block so the example better matches the access pattern being described.
- The networking section said SSH was restricted to known IPs, but the original code only denied SSH from the `Internet` service tag. I added an explicit allow rule for `var.admin_cidrs` and adjusted priorities so the snippet now demonstrates the stated restriction pattern.
- The intro and conclusion overstated that these controls map to Azure Policy / security center settings. I updated the wording to distinguish Azure-resource controls from Microsoft Entra tenant controls and corrected the service naming to Defender for Cloud.

## Review Notes
- The post does not pin a specific CIS Microsoft Azure Foundations Benchmark version. Control numbering and wording can change between benchmark releases, so a future revision should name the benchmark version explicitly.
- The snippets still assume surrounding resources and variables exist, including `var.admin_cidrs`, `azurerm_private_dns_zone.blob`, resource groups, subnets, SQL servers, and Log Analytics workspaces.
- `azurerm_security_center_subscription_pricing` still uses the historical `security_center` resource name even though the service is branded Microsoft Defender for Cloud.
