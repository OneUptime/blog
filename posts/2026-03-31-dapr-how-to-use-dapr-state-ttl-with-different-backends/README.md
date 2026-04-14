# How to Use Dapr State TTL with Different Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, TTL, Expiration, Redis, PostgreSQL, Microservice

Description: Learn how to use Dapr's state TTL feature to automatically expire state entries across Redis, PostgreSQL, and Azure Cosmos DB backends with a unified API.

---

Dapr's state TTL (time-to-live) feature lets you set an expiration time on any state entry with a single `ttlInSeconds` metadata field in the state request. The sidecar translates this into the native expiration mechanism of the backing store: Redis EXPIRE commands, PostgreSQL scheduled cleanup, or Azure Cosmos DB TTL attributes. Your application code stays identical regardless of which backend you use.

## Setting TTL on State Entries

Add `metadata.ttlInSeconds` to any state write request:

```bash
# Set a state entry that expires in 5 minutes
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "session-abc123",
    "value": {"userId": "user-1", "cart": ["item-a", "item-b"]},
    "metadata": {
      "ttlInSeconds": "300"
    }
  }]'

# The entry returns normally while alive
curl http://localhost:3500/v1.0/state/statestore/session-abc123

# After 300 seconds, it returns 204 No Content (not found)
```

Check whether a returned value has an expiry:

```bash
# Response includes metadata.ttlExpireTime header if TTL was set
curl -v http://localhost:3500/v1.0/state/statestore/session-abc123 2>&1 | \
  grep -i "ttlExpireTime"
# Metadata.ttlExpireTime: 2026-03-31T12:05:00Z
```

## TTL with Redis Backend

Redis natively supports key expiration with the EXPIRE command. Dapr calls EXPIRE automatically when `ttlInSeconds` is provided:

```yaml
# components/statestore-redis.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: enableTLS
    value: "false"
  # No special TTL configuration needed for Redis
  # Dapr uses EXPIRE natively
```

Verify TTL is applied in Redis:

```bash
# Check TTL remaining on a key
redis-cli TTL "order-service||session-abc123"
# Returns remaining seconds, e.g.: 247

# TTL of -1 means no expiration was set
# TTL of -2 means key does not exist (already expired)
```

## TTL with PostgreSQL Backend

PostgreSQL does not natively expire rows. Dapr's PostgreSQL state store stores the expiry time in a column and uses a background cleanup goroutine to delete expired rows:

```yaml
# components/statestore-postgres.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    value: "host=postgres user=dapr password=dapr dbname=daprstate port=5432"
  - name: cleanupInterval
    value: "60s"     # Run cleanup every 60 seconds (default: 1h)
  - name: tablePrefix
    value: "dapr_"
```

The Dapr PostgreSQL v2 state store creates a table with an `expires_at` column:

```sql
-- Dapr creates this schema automatically (v2)
CREATE TABLE dapr_state (
    key        TEXT NOT NULL PRIMARY KEY,
    value      BYTEA NOT NULL,
    etag       UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL  -- NULL = no expiration
);

CREATE INDEX ON dapr_state (expires_at);

-- Dapr's cleanup query (runs every cleanupInterval):
-- DELETE FROM dapr_state WHERE expires_at IS NOT NULL AND expires_at < NOW();
```

Lower `cleanupInterval` for short-lived data (like user sessions) to reclaim space faster.

## TTL with Azure Cosmos DB Backend

Azure Cosmos DB has built-in TTL support at the container level. Dapr sets the `ttl` field on each document and Cosmos DB uses it together with the system `_ts` timestamp to determine expiration:

```yaml
# components/statestore-cosmos.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://myaccount.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmos-secret
      key: masterKey
  - name: database
    value: "daprStateStore"
  - name: collection
    value: "daprState"
```

Enable TTL on the Cosmos DB container (required for TTL to work):

```bash
# Enable TTL on the container with default of -1 (items control their own TTL)
az cosmosdb sql container update \
  --account-name myaccount \
  --database-name daprStateStore \
  --name daprState \
  --resource-group myRG \
  --ttl -1
```

Dapr sets the `ttl` field on each Cosmos DB document automatically when `ttlInSeconds` is provided in the state write request.

## Application Code for TTL

TTL usage is identical across all backends:

```python
# session_manager.py
import os
import requests

DAPR_PORT = int(os.environ.get("DAPR_HTTP_PORT", 3500))
DAPR_URL = f"http://localhost:{DAPR_PORT}/v1.0"

SESSION_TTL = 3600      # 1 hour
CACHE_TTL = 300         # 5 minutes
TEMP_LOCK_TTL = 30      # 30 seconds

def save_session(session_id: str, user_data: dict):
    """Save a user session with 1-hour TTL."""
    resp = requests.post(f"{DAPR_URL}/state/statestore", json=[{
        "key": f"session-{session_id}",
        "value": user_data,
        "metadata": {"ttlInSeconds": str(SESSION_TTL)}
    }])
    return resp.status_code == 204

def cache_result(cache_key: str, data: dict):
    """Cache a computed result for 5 minutes."""
    resp = requests.post(f"{DAPR_URL}/state/statestore", json=[{
        "key": f"cache-{cache_key}",
        "value": data,
        "metadata": {"ttlInSeconds": str(CACHE_TTL)}
    }])
    return resp.status_code == 204

def acquire_lock(resource_id: str, owner_id: str) -> bool:
    """Acquire a short-lived distributed lock using TTL."""
    # First check if lock exists
    resp = requests.get(f"{DAPR_URL}/state/statestore/lock-{resource_id}")
    if resp.status_code == 200:
        return False  # Lock held

    # Try to acquire (race condition possible without atomic check-and-set)
    resp = requests.post(f"{DAPR_URL}/state/statestore", json=[{
        "key": f"lock-{resource_id}",
        "value": {"owner": owner_id},
        "metadata": {"ttlInSeconds": str(TEMP_LOCK_TTL)}
    }])
    return resp.status_code == 204

def get_session(session_id: str) -> dict | None:
    """Retrieve a session; returns None if expired or not found."""
    resp = requests.get(f"{DAPR_URL}/state/statestore/session-{session_id}")
    if resp.status_code == 200 and resp.text:
        return resp.json()
    return None
```

## TTL in .NET

```csharp
// SessionService.cs
using Dapr.Client;

public class SessionService
{
    private readonly DaprClient _dapr;
    private const string StoreName = "statestore";

    public SessionService(DaprClient dapr) => _dapr = dapr;

    public async Task SaveSessionAsync(string sessionId, UserSession session)
    {
        var metadata = new Dictionary<string, string>
        {
            { "ttlInSeconds", "3600" }  // 1 hour TTL
        };

        await _dapr.SaveStateAsync(
            StoreName,
            $"session-{sessionId}",
            session,
            metadata: metadata);
    }

    public async Task<UserSession?> GetSessionAsync(string sessionId)
    {
        return await _dapr.GetStateAsync<UserSession>(
            StoreName,
            $"session-{sessionId}");
        // Returns null if expired or not found
    }

    public async Task CacheAsync<T>(string key, T value, int ttlSeconds = 300)
    {
        var metadata = new Dictionary<string, string>
        {
            { "ttlInSeconds", ttlSeconds.ToString() }
        };

        await _dapr.SaveStateAsync(StoreName, $"cache-{key}", value, metadata: metadata);
    }
}

public record UserSession(string UserId, string Email, DateTime LoginTime);
```

## Backend TTL Comparison

```text
Backend          TTL Mechanism              Cleanup Method         Precision
-----------      -------------------        ------------------     ---------
Redis            EXPIRE / EXPIREAT          Redis internal         ~1 second
PostgreSQL       expires_at column          Background goroutine   cleanupInterval
Azure CosmosDB   ttl document field         Cosmos DB internal     ~1 minute
MongoDB          TTL index on field         MongoDB background     ~60 seconds
MySQL            expires_at column          Dapr cleanup loop      cleanupInterval
```

## Summary

Dapr state TTL provides a unified interface for expiring state entries by including `ttlInSeconds` in the state write metadata. The sidecar maps this to the native expiration mechanism of each backend: Redis EXPIRE for Redis, an `expires_at` column with a periodic cleanup goroutine for PostgreSQL, and document-level TTL attributes for Azure Cosmos DB and MongoDB. For short-lived data like sessions and caches, set `cleanupInterval` on PostgreSQL-backed stores to a low value (30-60 seconds) to reclaim storage promptly, since row deletion only happens at each cleanup interval rather than exactly at expiry.
