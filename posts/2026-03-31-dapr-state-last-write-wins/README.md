# How to Use Last-Write-Wins Concurrency in Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Concurrency, Last-Write-Wins, Key-Value

Description: Learn how to use last-write-wins concurrency mode in Dapr state management for scenarios where the most recent update should always overwrite previous values.

---

## What Is Last-Write-Wins?

Last-write-wins is the default concurrency mode in Dapr state management. Any write to a key succeeds regardless of whether another process has already written to that key. The most recent write takes effect.

This is appropriate for:
- Cache invalidation
- Session token updates
- Configuration values changed by a single writer
- Metrics and counters (with atomic operations)

## Default Behavior

Without specifying concurrency options, Dapr uses last-write-wins:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "session:alice", "value": {"token": "abc123", "expires": 1712345678}}]'
```

Any concurrent writer can overwrite this without a 409 conflict.

## Explicitly Setting Last-Write-Wins

You can also set it explicitly:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "feature-flags",
    "value": {"darkMode": true, "betaFeatures": false},
    "options": {
      "concurrency": "last-write",
      "consistency": "eventual"
    }
  }]'
```

## Using the Node.js SDK

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Last-write-wins is the default
await client.state.save('statestore', [
  {
    key: 'app-config',
    value: { maintenanceMode: false, maxConnections: 100 },
    options: {
      concurrency: 'last-write',
      consistency: 'eventual',
    }
  }
]);
```

## Cache Update Pattern

Last-write-wins is ideal for cache entries:

```javascript
async function refreshUserCache(userId) {
  const user = await db.getUser(userId);
  // Always overwrite cache with latest DB value
  await client.state.save('statestore', [
    {
      key: `user-cache:${userId}`,
      value: user,
      options: { concurrency: 'last-write', consistency: 'eventual' }
    }
  ]);
}
```

## Leaderboard Update Pattern

```javascript
async function updateScore(playerId, score) {
  const existing = await client.state.get('statestore', `score:${playerId}`);
  // Only update if new score is higher (business logic, not ETag)
  if (!existing || score > existing.points) {
    await client.state.save('statestore', [
      { key: `score:${playerId}`, value: { playerId, points: score, updatedAt: Date.now() } }
    ]);
  }
}
```

## When to Use Last-Write-Wins vs. First-Write-Wins

| Scenario | Recommended Mode |
|----------|-----------------|
| Session management | Last-write-wins |
| Financial transactions | First-write-wins |
| Config that one service owns | Last-write-wins |
| Shared resources with concurrent writers | First-write-wins |
| Cache entries | Last-write-wins |
| Order processing | First-write-wins |

## Combining with Strong Consistency

For scenarios where you need the latest value and want your write to be immediately visible:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "leader-election",
    "value": {"leader": "pod-abc-123", "since": 1712345678},
    "options": {"concurrency": "last-write", "consistency": "strong"}
  }]'
```

## Summary

Last-write-wins is Dapr's default concurrency mode and is appropriate for cache entries, sessions, and configuration values where the latest update should always win. Use it for single-writer scenarios or cases where occasional data overwrites are acceptable. For shared resources with multiple concurrent writers, use first-write-wins with ETags to detect conflicts.
