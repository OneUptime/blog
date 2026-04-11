# Validation Summary: How to Configure Azure Cache for Redis TLS

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Azure Cache for Redis
- Azure CLI (`az redis`)
- Terraform (AzureRM provider)
- Python (redis-py)
- Node.js (node-redis v4)
- C# / .NET (StackExchange.Redis)
- OpenSSL
- TLS 1.2 / 1.3

## Sources Consulted
- [Azure CLI `az redis` reference](https://learn.microsoft.com/en-us/cli/azure/redis?view=azure-cli-latest)
- [Azure Cache for Redis TLS configuration](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-tls-configuration)
- [Remove TLS 1.0/1.1 from Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-remove-tls-10-11)
- [Terraform `azurerm_redis_cache` resource docs (v4.61.0)](https://registry.terraform.io/providers/hashicorp/azurerm/4.61.0/docs/resources/redis_cache)
- [GitHub issue #26943 - `enable_non_ssl_port` renamed to `non_ssl_port_enabled`](https://github.com/hashicorp/terraform-provider-azurerm/issues/26943)
- [StackExchange.Redis Configuration docs](https://stackexchange.github.io/StackExchange.Redis/Configuration.html)
- [node-redis client configuration](https://github.com/redis/node-redis/blob/master/docs/client-configuration.md)
- [Azure Cache for Redis Python quickstart](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-python-get-started)

## Issues Found
1. **Terraform `enable_non_ssl_port` attribute renamed**: The `enable_non_ssl_port` attribute in the `azurerm_redis_cache` Terraform resource was renamed to `non_ssl_port_enabled` starting with AzureRM provider v3.114.0 (deprecated) and fully replaced in v4.0+. Since the current provider version is 4.61.0, the old attribute name would cause a deprecation warning or error. Changed `enable_non_ssl_port = false` to `non_ssl_port_enabled = false`.

## Review Notes
- The Azure CLI commands (`az redis show`, `az redis update`) are correct and use valid parameters.
- The Python redis-py example is correct. In some environments, explicitly setting `ssl_ca_certs` may be needed for certificate verification, but the code as written will use the system's default CA bundle.
- The Node.js node-redis v4 example uses valid `socket: { tls: true }` syntax. Microsoft's quickstart docs also show a URL-based approach (`rediss://host:6380`), but both patterns are correct.
- The StackExchange.Redis C# example is correct. The `Ssl = true` and `SslProtocols = Tls12` configuration is the recommended approach.
- The OpenSSL verification command is correct and useful for debugging TLS connectivity.
- Port 6380 (TLS) and 6379 (non-TLS) are accurately described throughout.
