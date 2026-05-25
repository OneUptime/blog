# Validation Summary: How to Create Azure Purview Accounts in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AzureRM Terraform provider
- Microsoft Purview
- Azure Private Link and private endpoints
- Azure Monitor diagnostic settings
- Azure role assignments
- Azure Key Vault access policies

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_purview_account` resource, https://registry.terraform.io/providers/hashicorp/azurerm/4.14.0/docs/resources/purview_account
- HashiCorp Terraform Registry: `azurerm_monitor_diagnostic_setting` resource, https://registry.terraform.io/providers/hashicorp/azurerm/3.84.0/docs/resources/monitor_diagnostic_setting
- HashiCorp Help Center: AzureRM v4 `subscription_id` provider requirement, https://support.hashicorp.com/hc/en-us/articles/40621007246099-Required-subscription-id-Error-in-Terraform-with-AzureRM
- Microsoft Learn: Use private endpoints for your Microsoft Purview account, https://learn.microsoft.com/en-us/purview/data-gov-classic-private-link
- Microsoft Learn: Connect privately and securely to your Microsoft Purview account, https://learn.microsoft.com/en-us/purview/catalog-private-link-account-portal
- Microsoft Learn: Configure DNS name resolution for Microsoft Purview private endpoints, https://learn.microsoft.com/en-us/purview/data-gov-classic-private-link-name-resolution
- Microsoft Learn: Supported logs for `microsoft.purview/accounts`, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-purview-accounts-logs
- Microsoft Learn: Discover and govern Azure SQL Database in Microsoft Purview, https://learn.microsoft.com/en-us/purview/register-scan-azure-sql-database
- Microsoft Learn: Discover and govern Azure Blob Storage in Microsoft Purview, https://learn.microsoft.com/en-us/purview/register-scan-azure-blob-storage-source
- Microsoft Learn: Credentials for source authentication in Microsoft Purview Data Map, https://learn.microsoft.com/en-us/purview/data-map-data-scan-credentials
- Microsoft Learn: Learn about data governance in the Microsoft Purview portal, https://learn.microsoft.com/en-us/purview/data-governance-purview-portal

## Issues Found
- The Terraform provider example pinned AzureRM to `~> 3.80`. Updated it to `~> 4.0` and added `subscription_id = var.subscription_id`, because AzureRM v4 requires an explicit subscription ID for plan/apply operations.
- The managed identity comment said a system-assigned managed identity is required. Changed the wording because the Terraform resource requires an identity block, but supports both system-assigned and user-assigned identities.
- The private endpoint section said account and portal endpoints were enough for a fully private deployment. Updated it to clarify that those endpoints apply to the classic Purview portal/API access, ingestion private endpoints are needed for private scanning, and the new Microsoft Purview portal uses the platform private endpoint model.
- The location variable used a hard-coded allowlist that rejected currently supported Purview regions. Replaced it with a documentation note so the example does not encode stale region availability.
- The catalog endpoint output manually constructed the endpoint URL. Updated it to use the provider-exported `catalog_endpoint` attribute.

## Review Notes
The role assignments, Key Vault secret permissions, private DNS zone names for classic endpoints, and diagnostic log categories match the official documentation reviewed. Future revisions could add a separate example for ingestion private endpoints or the new Microsoft Purview platform private endpoint flow, but that would be an expansion rather than a correctness fix.
