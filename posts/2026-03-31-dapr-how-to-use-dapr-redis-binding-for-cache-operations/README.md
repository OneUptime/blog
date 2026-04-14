# How to Use Dapr Redis Binding for Cache Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Binding, Caching, Microservice

Description: Learn how to use the Dapr Redis output binding to perform cache operations like get, set, and delete without managing Redis client libraries in your code.

---

## What Is the Dapr Redis Binding

The Dapr Redis output binding allows your application to interact with Redis for common operations - setting keys, getting values, and deleting entries - through the Dapr sidecar API. This removes the need to include and configure a Redis client in your application directly.

Note: Dapr also provides a Redis-backed state store component. The binding is useful when you need direct Redis command access beyond simple key-value state.

## Prerequisites

- Dapr CLI installed and initialized
- A running Redis instance (local or remote)
- Basic familiarity with Redis

## Define the Redis Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-cache
  namespace: default
spec:
  type: bindings.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: enableTLS
    value: "false"
```

For a Redis instance with authentication:

```yaml
  - name: redisHost
    value: "redis.production.example.com:6380"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "true"
```

## Supported Operations

The Redis binding supports three core operations:

```text
create  - SET a key with an optional TTL
get     - GET the value of a key
delete  - DEL a key
```

## Set a Cache Entry

```bash
curl -X POST http://localhost:3500/v1.0/bindings/redis-cache \
  -H "Content-Type: application/json" \
  -d '{
    "data": "myvalue",
    "metadata": {
      "key": "session:user123",
      "ttlInSeconds": "3600"
    },
    "operation": "create"
  }'
```

## Get a Cache Entry

```bash
curl -X POST http://localhost:3500/v1.0/bindings/redis-cache \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "key": "session:user123"
    },
    "operation": "get"
  }'
```

Response:

```json
{
  "data": "myvalue"
}
```

## Delete a Cache Entry

```bash
curl -X POST http://localhost:3500/v1.0/bindings/redis-cache \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "key": "session:user123"
    },
    "operation": "delete"
  }'
```

## Use in a Node.js Application

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();
const BINDING = 'redis-cache';

async function cacheSet(key, value, ttlSeconds = 3600) {
  await client.binding.send(BINDING, 'create', value, {
    key,
    ttlInSeconds: String(ttlSeconds),
  });
}

async function cacheGet(key) {
  const result = await client.binding.send(BINDING, 'get', '', { key });
  return result?.data ?? null;
}

async function cacheDelete(key) {
  await client.binding.send(BINDING, 'delete', '', { key });
}

// Example: cache a user profile
async function getUserProfile(userId) {
  const cacheKey = `profile:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    console.log('Cache hit for', cacheKey);
    return JSON.parse(cached);
  }

  const profile = await fetchProfileFromDB(userId);
  await cacheSet(cacheKey, JSON.stringify(profile), 1800);
  return profile;
}
```

## Use in a Python Application

```python
from dapr.clients import DaprClient
import json

BINDING = 'redis-cache'

def cache_set(key: str, value: str, ttl_seconds: int = 3600):
    with DaprClient() as client:
        client.invoke_binding(
            binding_name=BINDING,
            operation='create',
            data=value,
            binding_metadata={'key': key, 'ttlInSeconds': str(ttl_seconds)}
        )

def cache_get(key: str):
    with DaprClient() as client:
        resp = client.invoke_binding(
            binding_name=BINDING,
            operation='get',
            data='',
            binding_metadata={'key': key}
        )
        return resp.text() if resp else None

def cache_delete(key: str):
    with DaprClient() as client:
        client.invoke_binding(
            binding_name=BINDING,
            operation='delete',
            data='',
            binding_metadata={'key': key}
        )
```

## Store Complex Objects

Serialize objects to JSON before caching:

```javascript
const user = { id: 'u1', name: 'Alice', role: 'admin' };
await cacheSet('user:u1', JSON.stringify(user));

const raw = await cacheGet('user:u1');
const retrieved = JSON.parse(raw);
console.log(retrieved.name); // Alice
```

## Summary

The Dapr Redis binding gives your microservices a simple, dependency-free way to perform cache read, write, and delete operations through the Dapr sidecar. By centralizing Redis configuration in a component YAML, you can change your caching backend without modifying application code. The binding supports TTL-based expiration and integrates cleanly with Dapr's secret store for secure credential management.
