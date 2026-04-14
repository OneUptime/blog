# How to Implement Lease Management with Dapr State and Lock

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Lock, Lease, Distributed System

Description: Learn how to implement distributed lease management using Dapr state and distributed lock building blocks to coordinate exclusive resource access across replicas.

---

## What Is Lease Management?

A lease is a time-limited exclusive lock. It lets one service replica claim ownership of a resource (a job, a partition, a device) for a defined period. Other replicas back off until the lease expires or is explicitly released. Dapr provides both a distributed lock API and state-based leases.

## Using the Dapr Distributed Lock API

The lock building block is the simplest way to implement a lease:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function acquireLease(resourceId, ttlSeconds = 30) {
  const result = await client.lock.lock(
    'redis-lock-store',     // lock store component name
    resourceId,             // resource to lock
    'owner-' + process.pid, // owner identifier
    ttlSeconds
  );
  return result.success;
}

async function releaseLease(resourceId) {
  await client.lock.unlock(
    'redis-lock-store',
    resourceId,
    'owner-' + process.pid
  );
}
```

## Configure the Lock Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-lock-store
  namespace: production
spec:
  type: lock.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: enableTLS
      value: "false"
```

## State-Based Lease for Richer Metadata

When you need to store lease metadata alongside the lock, use state with ETags:

```javascript
async function acquireStateLease(resourceId, ownerId, ttlSeconds) {
  const leaseKey = `lease:${resourceId}`;
  const items = await client.state.getBulk('config-store', [leaseKey]);
  const entry = items.find(i => i.key === leaseKey);

  if (entry && entry.data) {
    const lease = entry.data;
    if (Date.now() < lease.expiresAt) {
      return { acquired: false, owner: lease.ownerId };
    }
  }

  // Attempt to write the lease with optimistic concurrency
  try {
    await client.state.save('config-store', [
      {
        key: leaseKey,
        value: {
          ownerId,
          acquiredAt: Date.now(),
          expiresAt: Date.now() + ttlSeconds * 1000
        },
        etag: entry ? entry.etag : undefined,
        options: { concurrency: 'first-write' }
      }
    ]);
    return { acquired: true, ownerId };
  } catch (err) {
    return { acquired: false };
  }
}
```

## Leader Election with Leases

Implement leader election by having all replicas race to acquire a single lease:

```javascript
async function runLeaderElection(workerId) {
  const LEASE_TTL = 20;
  const RENEWAL_INTERVAL = 10_000;

  const tryBecomeLeader = async () => {
    const success = await acquireLease('leader-election', LEASE_TTL);
    if (success) {
      console.log(`Worker ${workerId} is now the leader`);
      runLeaderWork();
    }
  };

  // Keep trying to acquire or renew
  setInterval(tryBecomeLeader, RENEWAL_INTERVAL);
  await tryBecomeLeader();
}
```

## Lease Renewal

```javascript
async function renewLease(resourceId, ttlSeconds = 30) {
  // Re-acquire with the same owner extends the TTL
  return acquireLease(resourceId, ttlSeconds);
}
```

## Summary

Dapr's distributed lock building block provides simple lease primitives for mutual exclusion. For richer lease metadata, combining state management with ETag-based optimistic concurrency gives you fine-grained control over lease acquisition, expiry tracking, and leader election across any number of replicas.
