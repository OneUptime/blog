# How to Connect Azure Cache for Redis to Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, App Service, Azure Cache for Redis, Web Application

Description: Learn how to connect Azure App Service to Azure Cache for Redis using app settings, VNet integration, and connection string best practices for web applications.

---

Azure App Service apps connect to Azure Cache for Redis over TLS using the cache's hostname and access key. For Premium Redis with a private endpoint, you also need VNet integration on the App Service plan.

## Getting the Redis Connection Details

```bash
# Get hostname and SSL port
az redis show \
  --name my-redis \
  --resource-group rg-prod \
  --query "{Host:hostName,SslPort:sslPort}"

# Get the primary access key
az redis list-keys \
  --name my-redis \
  --resource-group rg-prod \
  --query "primaryKey" -o tsv
```

## Setting App Service Connection String

```bash
az webapp config connection-string set \
  --name my-webapp \
  --resource-group rg-prod \
  --connection-string-type Custom \
  --settings \
    RedisConnection="my-redis.redis.cache.windows.net:6380,password=<key>,ssl=True,abortConnect=False"
```

Or as an app setting:

```bash
az webapp config appsettings set \
  --name my-webapp \
  --resource-group rg-prod \
  --settings \
    "REDIS_HOST=my-redis.redis.cache.windows.net" \
    "REDIS_PORT=6380" \
    "REDIS_ACCESS_KEY=<key>"
```

## Terraform

```hcl
resource "azurerm_linux_web_app" "main" {
  name                = "my-webapp"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {}

  app_settings = {
    REDIS_HOST       = azurerm_redis_cache.main.hostname
    REDIS_PORT       = "6380"
    REDIS_ACCESS_KEY = azurerm_redis_cache.main.primary_access_key
  }

  connection_string {
    name  = "RedisConnection"
    type  = "Custom"
    value = "${azurerm_redis_cache.main.hostname}:6380,password=${azurerm_redis_cache.main.primary_access_key},ssl=True,abortConnect=False"
  }
}
```

## Python Flask App Example

```python
import redis
import os
from flask import Flask

app = Flask(__name__)

cache = redis.Redis(
    host=os.environ["REDIS_HOST"],
    port=int(os.environ.get("REDIS_PORT", 6380)),
    password=os.environ["REDIS_ACCESS_KEY"],
    ssl=True,
    decode_responses=True,
)

@app.route("/cached-data")
def get_data():
    cached = cache.get("expensive-data")
    if cached:
        return {"source": "cache", "data": cached}
    result = "computed-value"
    cache.setex("expensive-data", 300, result)
    return {"source": "compute", "data": result}
```

## VNet Integration for Premium Redis

If your Redis instance uses a private endpoint, enable VNet integration on the App Service:

```bash
az webapp vnet-integration add \
  --name my-webapp \
  --resource-group rg-prod \
  --vnet my-vnet \
  --subnet webapp-subnet
```

Then ensure the webapp subnet can reach the Redis private endpoint subnet on port 6380.

## Using Key Vault References

Instead of storing the access key directly in app settings, use a Key Vault reference:

```bash
# Store key in Key Vault
az keyvault secret set \
  --vault-name my-keyvault \
  --name redis-access-key \
  --value "<redis-access-key>"

# Reference it in app settings
az webapp config appsettings set \
  --name my-webapp \
  --resource-group rg-prod \
  --settings \
    "REDIS_ACCESS_KEY=@Microsoft.KeyVault(SecretUri=https://my-keyvault.vault.azure.net/secrets/redis-access-key/)"
```

## Summary

Azure App Service connects to Azure Cache for Redis via app settings or connection strings referencing the hostname, port 6380, and access key. For Premium Redis with private endpoints, enable VNet integration on the App Service. Store access keys in Azure Key Vault and reference them with Key Vault references to avoid secrets in configuration.
