# Validation Summary: How to Set Up Azure SQL Transparent Data Encryption with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Azure SQL Database logical server
- Transparent Data Encryption (TDE)
- Customer-managed keys (CMK)
- Azure Key Vault
- Azure managed identities
- AzureRM provider

## Sources Consulted
- Azure SQL customer-managed TDE overview: https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-byok-overview?view=azuresql
- Azure SQL managed identity guidance for customer-managed TDE: https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-byok-identity?view=azuresql-mi
- Azure SQL TDE protector rotation guidance: https://learn.microsoft.com/en-us/azure/azure-sql/database/transparent-data-encryption-byok-key-rotation?view=azuresql
- AzureRM `azurerm_mssql_server_transparent_data_encryption` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server_transparent_data_encryption
- AzureRM `azurerm_mssql_server` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- AzureRM `azurerm_mssql_database` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- AzureRM `azurerm_key_vault_key` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key
- AzureRM `azurerm_key_vault_access_policy` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy
- AzureRM `azurerm_client_config` data source docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config

## Issues Found
- The original Key Vault example created a new vault and then attempted to create a key in it without granting the deploying identity any key permissions. That can cause `azurerm_key_vault_key` creation to fail against a fresh vault using access policies. I added a `current_user` access policy with the documented key permissions required by the provider and made the key depend on it.
- The original SQL Server example used a separate `azurerm_mssql_server_transparent_data_encryption` resource but did not ignore changes to `transparent_data_encryption_key_vault_key_id` on `azurerm_mssql_server`. The official provider example includes this safeguard to avoid drift when the TDE protector is managed separately, so I added the `lifecycle.ignore_changes` block.
- Step 5 claimed to verify TDE and said TDE could be explicitly enabled at the database level, but the snippet only created a database. I corrected the step title to match what the code actually does and added `transparent_data_encryption_enabled = true` so the example explicitly enables the documented database-level TDE flag while inheriting the server-level CMK protector.
- The automatic-rotation comment implied immediate use of new key versions. I reworded it to say Azure SQL rotates to newer key versions, which is consistent with the official rotation guidance.

## Review Notes
- `sku_name = "premium"` is valid, but it is not required for the software-backed `RSA` key shown here. Premium is only needed for HSM-backed keys.
- If the Key Vault is protected by firewall or virtual network rules, Microsoft Learn requires enabling `Allow trusted Microsoft services to bypass this firewall` for Azure SQL to access the TDE key.
- Microsoft Learn describes automatic TDE protector rotation as occurring within 24 hours after a new key version is detected. The post now avoids making a more specific timing claim.
