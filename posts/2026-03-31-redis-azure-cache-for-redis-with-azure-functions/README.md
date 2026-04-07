# How to Use Azure Cache for Redis with Azure Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Azure, Azure Function, Serverless, Caching

Description: Learn how to connect Azure Functions to Azure Cache for Redis for caching, session storage, and rate limiting in serverless workloads with connection reuse best practices.

---

Azure Functions can use Azure Cache for Redis for caching expensive results, implementing rate limiting, or sharing state between function instances. The main challenge is connection management - Redis connections are expensive to create, and Functions may spin up many instances.

## Prerequisites

- Azure Cache for Redis (Standard or Premium)
- Azure Function App with VNet integration (for Premium Redis)
- `redis` Python package or `StackExchange.Redis` for C#

## Connection Reuse in Python Functions

Initialize the client at module level to reuse connections across invocations:

```python
import azure.functions as func
import redis
import os
import json
import logging

app = func.FunctionApp()

# Module-level client - reused across warm invocations
_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=os.environ["REDIS_HOST"],
            port=6380,
            password=os.environ["REDIS_ACCESS_KEY"],
            ssl=True,
            decode_responses=True,
            socket_connect_timeout=3,
        )
    return _redis_client

@app.route(route="products/{id}", methods=["GET"])
def get_product(req: func.HttpRequest) -> func.HttpResponse:
    product_id = req.route_params.get("id")
    r = get_redis()
    cache_key = f"product:{product_id}"

    cached = r.get(cache_key)
    if cached:
        return func.HttpResponse(cached, mimetype="application/json")

    # Simulate DB call
    product = {"id": product_id, "name": "Widget", "price": 9.99}
    r.setex(cache_key, 300, json.dumps(product))
    return func.HttpResponse(json.dumps(product), mimetype="application/json")
```

## Rate Limiting Function

```python
@app.route(route="api/{action}", methods=["POST"])
def rate_limited_action(req: func.HttpRequest) -> func.HttpResponse:
    client_ip = req.headers.get("X-Forwarded-For", "unknown")
    r = get_redis()
    rate_key = f"rate:{client_ip}:minute"

    count = r.incr(rate_key)
    if count == 1:
        r.expire(rate_key, 60)

    if count > 100:
        return func.HttpResponse("Too Many Requests", status_code=429)

    return func.HttpResponse("OK", status_code=200)
```

## C# Connection with IConnectionMultiplexer

For C# Functions, register a singleton via dependency injection:

```csharp
using System;
using StackExchange.Redis;
using Microsoft.Azure.Functions.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;

[assembly: FunctionsStartup(typeof(MyFunction.Startup))]
namespace MyFunction
{
    public class Startup : FunctionsStartup
    {
        public override void Configure(IFunctionsHostBuilder builder)
        {
            var redisConnection = Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING");
            builder.Services.AddSingleton<IConnectionMultiplexer>(
                ConnectionMultiplexer.Connect(redisConnection)
            );
        }
    }
}
```

## App Settings Configuration

```bash
az functionapp config appsettings set \
  --name my-func-app \
  --resource-group rg-prod \
  --settings \
    "REDIS_HOST=my-redis.redis.cache.windows.net" \
    "REDIS_ACCESS_KEY=<key>"
```

## VNet Integration for Premium Redis

```bash
az functionapp vnet-integration add \
  --name my-func-app \
  --resource-group rg-prod \
  --vnet my-vnet \
  --subnet functions-subnet
```

## Summary

Azure Functions connect to Azure Cache for Redis using module-level (Python) or singleton (C#) connection patterns to reuse connections across invocations. Use VNet integration to access Premium Redis instances on their private endpoint. Store the access key in Azure Key Vault and reference it via a Key Vault reference in app settings for secure credential management.
