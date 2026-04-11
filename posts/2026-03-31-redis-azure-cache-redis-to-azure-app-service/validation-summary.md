# Validation Summary: How to Connect Azure Cache for Redis to Azure App Service

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Azure Cache for Redis
- Azure App Service
- Azure CLI (`az redis`, `az webapp`)
- Terraform (azurerm provider — `azurerm_linux_web_app`, `azurerm_redis_cache`)
- Python / Flask with redis-py
- Azure Key Vault (Key Vault references)
- Azure VNet integration

## Sources Consulted
- Azure CLI `az redis` reference: https://learn.microsoft.com/en-us/cli/azure/redis
- Azure CLI `az webapp config connection-string` reference: https://learn.microsoft.com/en-us/cli/azure/webapp/config/connection-string
- Azure CLI `az webapp config appsettings` reference: https://learn.microsoft.com/en-us/cli/azure/webapp/config/appsettings
- Azure CLI `az webapp vnet-integration` reference: https://learn.microsoft.com/en-us/cli/azure/webapp/vnet-integration
- Azure CLI `az keyvault secret` reference: https://learn.microsoft.com/en-us/cli/azure/keyvault/secret
- Terraform azurerm_linux_web_app resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- Terraform azurerm_redis_cache resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache
- Azure App Service Key Vault references: https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- StackExchange.Redis connection string format: https://stackexchange.github.io/StackExchange.Redis/Configuration

## Issues Found

1. **Terraform: missing required `site_config` block** — The `azurerm_linux_web_app` resource requires a `site_config` block. Without it, `terraform validate` and `terraform plan` fail with a missing required argument error. Added `site_config {}` to the resource definition.

2. **Python: unused `session` import** — `session` was imported from `flask` but never used in the example code. Removed the unused import to keep the example clean and accurate.

## Review Notes
- All Azure CLI commands use correct flags and syntax for current versions.
- The StackExchange.Redis connection string format (`hostname:6380,password=...,ssl=True,abortConnect=False`) is correct and widely used.
- Port 6380 is correctly identified as the TLS/SSL port for Azure Cache for Redis.
- The Key Vault reference syntax `@Microsoft.KeyVault(SecretUri=...)` is correct for App Service.
- The `redis.Redis()` call in Python uses correct parameters for connecting to Azure Cache for Redis over TLS.
- The Terraform `connection_string` block correctly uses type `"Custom"` for Redis, which is the appropriate type since there is no dedicated Redis connection string type in App Service.
