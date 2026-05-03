# Validation Summary: How to Deploy Azure SQL Database with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HashiCorp `azurerm` provider
- Azure SQL Database (logical server + database)
- Azure SQL serverless tier (General Purpose Gen5)
- Azure SQL firewall rules
- Azure Private Link / Private Endpoints
- Azure Active Directory (Entra ID) authentication for SQL

## Sources Consulted
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_firewall_rule
- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview (sub-resource / group ID for `Microsoft.Sql/servers`)

## Issues Found
No technical issues found.

Verified items:
- `azurerm_mssql_server`: `version = "12.0"` is valid (accepted values are `2.0` and `12.0`); `minimum_tls_version = "1.2"` is valid; `azuread_administrator` block fields `login_username` and `object_id` are correct.
- `azurerm_mssql_database`: `sku_name = "GP_S_Gen5_2"` is the canonical General Purpose Serverless Gen5 (2 vCore) SKU; `auto_pause_delay_in_minutes` and `min_capacity` (fractional values like `0.5`) are valid serverless arguments.
- `azurerm_mssql_firewall_rule`: `start_ip_address = "0.0.0.0"` / `end_ip_address = "0.0.0.0"` is the documented convention for the "Allow access to Azure services" rule.
- `azurerm_private_endpoint`: `subresource_names = ["sqlServer"]` is the correct (case-sensitive, camelCase) group ID for `Microsoft.Sql/servers` per Microsoft Learn.

## Review Notes
- The post's `Description` mentions "transparent data encryption" but the body does not include a TDE-specific code block. TDE is enabled by default on Azure SQL, so this is not technically inaccurate, but a reader may expect explicit `azurerm_mssql_server_transparent_data_encryption` examples. Not changed since the task scope is to fix technical errors only, not restructure content.
- A newer write-only variant `administrator_login_password_wo` (with `_wo_version`) exists alongside `administrator_login_password` for safer secret handling. The plain form used in the post is not deprecated, but the write-only variant is preferable for production. Worth a future enhancement.
- The Private Endpoint example references `azurerm_subnet.private` which is not declared in the post; readers will need to provide their own VNet/subnet definition. Not a technical error, but a minor completeness gap.
