# How to Configure Azure Cache for Redis TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, TLS, Security, Azure Cache for Redis

Description: Learn how to enforce TLS on Azure Cache for Redis, disable non-SSL ports, set minimum TLS version, and configure clients to connect securely.

---

Azure Cache for Redis supports TLS 1.2 and 1.3 on port 6380. Port 6379 (non-TLS) is disabled by default on new instances - but older instances may still have it open. This guide covers enforcing TLS and connecting clients correctly.

## Checking Current TLS Settings

```bash
az redis show \
  --name my-redis \
  --resource-group rg-prod \
  --query "{NonSslPort:enableNonSslPort,MinTLS:minimumTlsVersion,SslPort:sslPort}"
```

## Disabling the Non-SSL Port

```bash
az redis update \
  --name my-redis \
  --resource-group rg-prod \
  --set enableNonSslPort=false
```

## Setting Minimum TLS Version to 1.2

```bash
az redis update \
  --name my-redis \
  --resource-group rg-prod \
  --minimum-tls-version 1.2
```

## Terraform

```hcl
resource "azurerm_redis_cache" "main" {
  name                = "my-redis"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  capacity            = 2
  family              = "C"
  sku_name            = "Standard"
  non_ssl_port_enabled = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }
}
```

## Python Client (TLS Enabled)

```python
import redis
import ssl

client = redis.Redis(
    host="my-redis.redis.cache.windows.net",
    port=6380,        # SSL port
    password="<access-key>",
    ssl=True,
    ssl_cert_reqs=ssl.CERT_REQUIRED,
    decode_responses=True,
)

client.ping()
```

## Node.js Client (TLS Enabled)

```javascript
const redis = require('redis');

const client = redis.createClient({
  socket: {
    host: 'my-redis.redis.cache.windows.net',
    port: 6380,
    tls: true,
  },
  password: process.env.REDIS_ACCESS_KEY,
});

client.on('error', (err) => console.error('Redis error:', err));
await client.connect();
```

## .NET / C# Client

```csharp
using StackExchange.Redis;

var config = new ConfigurationOptions
{
    EndPoints = { "my-redis.redis.cache.windows.net:6380" },
    Password = Environment.GetEnvironmentVariable("REDIS_ACCESS_KEY"),
    Ssl = true,
    SslProtocols = System.Security.Authentication.SslProtocols.Tls12,
    AbortOnConnectFail = false,
};

var connection = ConnectionMultiplexer.Connect(config);
var db = connection.GetDatabase();
```

## Verifying with OpenSSL

```bash
openssl s_client \
  -connect my-redis.redis.cache.windows.net:6380 \
  -tls1_2 2>&1 | grep "SSL handshake"
```

## Summary

Azure Cache for Redis uses port 6380 for TLS connections. Disable port 6379 (non-SSL) and enforce a minimum TLS version of 1.2 on all instances. Clients must specify port 6380 and enable SSL/TLS in their connection options. Use Azure Policy to audit and enforce these settings across all Redis instances in your subscription.
