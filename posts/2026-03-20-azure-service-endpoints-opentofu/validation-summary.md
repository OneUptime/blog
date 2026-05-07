# Validation Summary: How to Create Azure Service Endpoints with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Virtual Network service endpoints
- Azure Storage
- Azure SQL Database
- Azure Key Vault
- Azure CLI
- AzureRM provider

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/init/
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/plan/
- Azure VNet integration for Azure services: https://learn.microsoft.com/en-us/azure/virtual-network/vnet-integration-for-azure-services
- Azure virtual network service endpoints overview: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- Azure Storage firewall rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security
- Azure Storage public network access rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-set-default-access
- Azure SQL network access controls: https://learn.microsoft.com/en-us/azure/azure-sql/database/network-access-controls-overview?view=azuresql
- Azure Key Vault network security: https://learn.microsoft.com/en-us/azure/key-vault/general/network-security
- Azure service endpoint policies: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoint-policies
- Azure CLI `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Azure CLI `az storage blob`: https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest
- AzureRM provider docs for `azurerm_subnet`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/subnet.html.markdown
- AzureRM provider docs for `azurerm_storage_account`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/storage_account.html.markdown
- AzureRM provider docs for `azurerm_mssql_server`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/mssql_server.html.markdown
- AzureRM provider docs for `azurerm_mssql_virtual_network_rule`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/mssql_virtual_network_rule.html.markdown
- AzureRM provider docs for `azurerm_key_vault`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/key_vault.html.markdown
- AzureRM provider docs for `azurerm_subnet_service_endpoint_storage_policy`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/subnet_service_endpoint_storage_policy.html.markdown

## Issues Found
- The Storage example disabled `public_network_access_enabled` while also trying to use service-endpoint-based network rules. For Azure Storage, service endpoints secure the public endpoint to selected networks; disabling public network access is the private-endpoint-only model. I changed `public_network_access_enabled` to `true` and kept `network_rules.default_action = "Deny"`.
- The Storage example described `ip_rules` too broadly. Azure Storage IP rules apply to public IP ranges, so I clarified the comment to say "public IP ranges".
- The SQL example used deprecated AzureRM resources (`azurerm_sql_server` and `azurerm_sql_virtual_network_rule`) that were deprecated in AzureRM 3.x and removed in 4.x. I replaced them with `azurerm_mssql_server` and `azurerm_mssql_virtual_network_rule`.
- The SQL example claimed that a firewall rule with `0.0.0.0` to `0.0.0.0` would deny all public internet access. In Azure SQL, that rule enables "Allow Azure services and resources to access this server", which is more permissive, not restrictive. I removed that block.
- The SQL example comment said the endpoint would enable automatically while `ignore_missing_vnet_service_endpoint = false`. The provider requires the subnet to already have the `Microsoft.Sql` service endpoint in that case, so I corrected the comment.
- The Key Vault example used the wrong AzureRM argument name: `enable_rbac_authorization`. The current provider uses `rbac_authorization_enabled`, so I updated it.

## Review Notes
- The post is now aligned with current AzureRM 4.x resource names and argument names.
- The Azure CLI and OpenTofu commands are valid as written. The local workspace did not have `az` or `tofu` installed, so command verification was done against Microsoft Learn and OpenTofu official documentation instead of local `--help` output.
- The service endpoint policy example is valid as written. The `service` field inside the `definition` block is optional for resource IDs and defaults to `Microsoft.Storage`.
