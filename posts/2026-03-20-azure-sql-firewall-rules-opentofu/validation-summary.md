# Validation Summary: How to Configure Azure SQL Firewall Rules with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Database
- Azure Resource Manager (`azurerm`) provider
- OpenTofu
- HCL
- Azure virtual network service endpoints

## Sources Consulted
- AzureRM provider docs for `azurerm_mssql_server`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- AzureRM provider docs for `azurerm_mssql_firewall_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_firewall_rule
- AzureRM provider docs for `azurerm_mssql_virtual_network_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_virtual_network_rule
- Azure SQL Database network access controls overview: https://learn.microsoft.com/en-us/azure/azure-sql/database/network-access-controls-overview?view=azuresql
- Azure SQL Database IP firewall rules: https://learn.microsoft.com/en-us/azure/azure-sql/database/firewall-configure?view=azuresql
- OpenTofu `for_each` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/

## Issues Found
- The Step 1 comment implied that `public_network_access_enabled = true` was restricting public access. I changed the comment to clarify that firewall and virtual network rules apply when the public endpoint is enabled, and that private-only access should use private endpoints instead.
- The Step 2 comment said “CIDR range (OpenTofu handles range arithmetic),” but the resource requires explicit `start_ip_address` and `end_ip_address` values. I changed the wording to “IP range” so the explanation matches the actual resource behavior.
- The Step 2 range example used `192.168.1.0` to `192.168.1.255`, which is a private RFC 1918 range and misleading in a server-level public-endpoint firewall example. I replaced it with a documentation public IPv4 range.
- The Step 2 Azure services comment was imprecise. I updated it to match Azure’s documented “Allow Azure services and resources to access this server” behavior for the `0.0.0.0` rule.
- The Step 4 virtual network rule example omitted the required subnet service endpoint setup. I added the minimal virtual network and subnet configuration with `service_endpoints = ["Microsoft.Sql"]` so the example aligns with current provider requirements.

## Review Notes
- The snippets are partial examples rather than a standalone OpenTofu project. They still assume existing provider configuration, an existing resource group resource, and a defined `sql_admin_password` variable.
- The `0.0.0.0` firewall rule is intentionally broad and allows Azure services and resources outside the current subscription boundary. For tighter access control, Azure recommends virtual network rules or private endpoints.
