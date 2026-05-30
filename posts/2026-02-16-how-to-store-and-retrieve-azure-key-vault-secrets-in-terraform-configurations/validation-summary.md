# Validation Summary: How to Store and Retrieve Azure Key Vault Secrets in Terraform Configurations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- HashiCorp Random provider
- HashiCorp Time provider
- Azure Key Vault
- Azure App Service / Linux Web Apps
- Azure Functions
- Azure managed identities
- Azure RBAC
- Azure Database for PostgreSQL Flexible Server

## Sources Consulted
- Terraform AzureRM `azurerm_key_vault_secret` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret
- Terraform AzureRM `azurerm_key_vault_secret` data source documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret
- Terraform AzureRM `azurerm_key_vault_secret` ephemeral resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/ephemeral-resources/key_vault_secret
- Terraform AzureRM `azurerm_key_vault` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- Terraform AzureRM `azurerm_linux_web_app` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- Terraform AzureRM deprecated resources migration guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/migrating-from-deprecated-resources
- Terraform AzureRM `azurerm_postgresql_flexible_server` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server
- Terraform Random provider ephemeral `random_password` documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/ephemeral-resources/password
- Terraform Time provider `time_rotating` documentation: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/rotating
- Terraform write-only arguments documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data/write-only
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Microsoft Learn, App Service Key Vault references: https://learn.microsoft.com/azure/app-service/app-service-key-vault-references
- Microsoft Learn, Azure Key Vault network security: https://learn.microsoft.com/azure/key-vault/general/network-security
- Microsoft Learn, Key Vault virtual network service endpoints and trusted services: https://learn.microsoft.com/azure/key-vault/key-vault-overview-vnet-service-endpoints

## Issues Found
- The post description claimed secrets could be stored and retrieved without exposing sensitive values in state or code. This was too broad because regular AzureRM Key Vault secret resources and data sources store secret values in Terraform state. I changed the wording to "minimizing" exposure.
- The state behavior explanation said created or read secrets always end up in state. Current Terraform and AzureRM support ephemeral resources and write-only arguments, so I qualified the statement to regular resource arguments and data sources and mentioned Key Vault references, ephemeral resources, and write-only arguments.
- The Key Vault network ACL comment implied `AzureServices` allows Azure services generally. Microsoft documents this as trusted Microsoft services only, and not every App Service runtime request is covered. I corrected the comment and added a firewall caveat for App Service Key Vault references.
- The writing-secrets examples used `random_password` resources and the `value` argument, which stores the generated secret in state. I updated them to use ephemeral `random_password` and AzureRM Key Vault Secret `value_wo` / `value_wo_version`.
- The read-secret App Service example used deprecated `azurerm_app_service` and `azurerm_app_service_plan` arguments. I updated it to `azurerm_linux_web_app` with `service_plan_id`.
- The PostgreSQL cross-module example used `administrator_password` and Key Vault Secret `value`, which store secret material in state. I updated it to use `administrator_password_wo` and Key Vault Secret `value_wo`.
- The Key Vault reference strings included a trailing slash after the secret name. I removed the trailing slash to match Microsoft's documented `SecretUri=https://myvault.vault.azure.net/secrets/mysecret` syntax.
- The rotation example used a stateful `random_password` resource with `keepers`. I updated it to show ephemeral password generation with `time_rotating` driving `value_wo_version`.
- The wrap-up said to accept secrets in state for other resources. I revised it to recommend ephemeral resources and write-only arguments where supported, while still protecting state where secrets remain.

## Review Notes
- Terraform was not installed in the local environment, so validation was performed against official Terraform Registry, HashiCorp Developer, and Microsoft Learn documentation rather than by running `terraform validate`.
- The snippets are partial examples and still assume surrounding resources and variables such as resource groups, service plans, provider configuration, and allowed IPs are defined elsewhere.
