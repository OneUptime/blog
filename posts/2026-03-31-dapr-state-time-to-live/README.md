# How to Use State Time-to-Live (TTL) in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, TTL, Expiration, Cache

Description: Learn how to set time-to-live (TTL) on Dapr state entries so they automatically expire and are removed from the state store without manual cleanup code.

---

## What Is State TTL in Dapr?

Dapr State TTL allows you to set an expiration time on individual state keys. Once the TTL elapses, the state store automatically deletes the entry. This is useful for session data, temporary caches, rate limiting counters, and any data with a natural expiry.

## Setting TTL on a State Entry

Use the `ttlInSeconds` metadata field when saving state:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {
      "key": "session:user-123",
      "value": {"userId": "user-123", "role": "admin"},
      "metadata": {
        "ttlInSeconds": "3600"
      }
    }
  ]'
```

The entry will automatically expire after 1 hour (3600 seconds).

## TTL in the Node.js SDK

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Save with 30-minute TTL
await client.state.save('statestore', [
  {
    key: 'otp:alice',
    value: { code: '847291', verified: false },
    metadata: { ttlInSeconds: '1800' }
  }
]);
```

## TTL in the Python SDK

```python
from dapr.clients import DaprClient

with DaprClient() as client:
    client.save_state(
        store_name='statestore',
        key='rate-limit:user-123',
        value='{"count": 1}',
        state_metadata={'ttlInSeconds': '60'}
    )
```

## Checking Remaining TTL

Dapr does not return the remaining TTL or expiration time when you retrieve a state entry via a simple GET request. If you need to track expiration, store the expiry timestamp as part of your value:

```javascript
await client.state.save('statestore', [
  {
    key: 'session:user-123',
    value: {
      userId: 'user-123',
      role: 'admin',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    },
    metadata: { ttlInSeconds: '3600' }
  }
]);
```

## Common TTL Use Cases

| Use Case | Suggested TTL |
|----------|--------------|
| User sessions | 1800-3600s (30min - 1hr) |
| One-time passwords | 300s (5min) |
| Rate limiting counters | 60s |
| API response cache | 300-600s |
| Temporary locks | 30s |

## State Store Support

Not all state stores support TTL. Supported stores include:

```bash
# Supported
state.redis       # Native TTL support via EXPIRE
state.mongodb     # TTL index support
state.cosmosdb    # TTL via document TTL setting
state.dynamodb    # TTL via DynamoDB TTL attribute
state.postgresql  # TTL via expiration column and background garbage collector
```

## Refreshing TTL on Access

To implement sliding expiration (reset TTL on each access), re-save the key on each read:

```javascript
async function getSessionWithSlide(sessionId) {
  const session = await client.state.get('statestore', `session:${sessionId}`);
  if (session) {
    // Slide the TTL by re-saving
    await client.state.save('statestore', [
      {
        key: `session:${sessionId}`,
        value: session,
        metadata: { ttlInSeconds: '3600' }
      }
    ]);
  }
  return session;
}
```

## Summary

Set TTL on Dapr state entries using the `ttlInSeconds` metadata field in your save request. The state store automatically expires and removes the entry after the specified duration. TTL is supported by Redis, MongoDB, Cosmos DB, DynamoDB, and PostgreSQL state backends. For sliding expiration, re-save the key with the TTL on each access.
