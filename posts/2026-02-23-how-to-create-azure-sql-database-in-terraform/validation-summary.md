# Validation Summary: How to Create Azure SQL Database in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- HashiCorp Random provider
- Azure SQL Database
- Azure SQL logical server
- Azure SQL firewall rules and virtual network rules
- Azure Key Vault
- Azure Storage auditing

## Sources Consulted
- HashiCorp AzureRM provider v3.80.0 `azurerm_mssql_server` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/mssql_server
- HashiCorp AzureRM provider v3.80.0 `azurerm_mssql_database` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/mssql_database
- HashiCorp AzureRM provider v3.80.0 `azurerm_mssql_firewall_rule` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/mssql_firewall_rule
- HashiCorp AzureRM provider v3.80.0 `azurerm_mssql_virtual_network_rule` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/mssql_virtual_network_rule
- HashiCorp AzureRM provider v3.80.0 `azurerm_mssql_server_extended_auditing_policy` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/mssql_server_extended_auditing_policy
- HashiCorp AzureRM provider v3.80.0 `azurerm_mssql_server_security_alert_policy` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/mssql_server_security_alert_policy
- HashiCorp AzureRM provider v3.80.0 `azurerm_key_vault_secret` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/3.80.0/docs/resources/key_vault_secret
- HashiCorp Random provider `random_password` documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- IETF RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.ietf.org/rfc/rfc5737

## Issues Found
- The password section implied that generating and storing the password in Key Vault fully avoided secret exposure. Updated the text to note that the generated password is still stored in Terraform state and that the state backend must be encrypted and access-controlled.
- The firewall rule used `203.0.113.0/24` as an office IP range without identifying it as an example range. Updated the comment to say it is documentation-only and must be replaced with a real office range.
- The virtual network rule example did not state that the target subnet needs the `Microsoft.Sql` service endpoint. Added a comment because Terraform's `azurerm_mssql_virtual_network_rule` fails unless that service endpoint exists, unless `ignore_missing_vnet_service_endpoint` is set.

## Review Notes
Terraform is not installed in this review environment, so I could not run `terraform validate`. The snippets were checked against official provider documentation for the pinned AzureRM provider series. The post pins AzureRM `~> 3.80`; AzureRM 4.x is now current, so a future update could modernize the provider version separately.
