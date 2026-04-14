# How to Use Dapr Distributed Lock for Resource Coordination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Resource Coordination, Concurrency, Microservice

Description: Use Dapr distributed locks to coordinate access to shared external resources across multiple microservice instances, preventing race conditions and data corruption.

---

When multiple microservice instances compete to access or modify the same external resource - a file, an external API with rate limits, or a shared database record - distributed locks ensure only one instance proceeds at a time. Dapr's lock API provides a portable coordination mechanism.

## Scenario: Coordinating File Export

Imagine multiple instances of a reporting service that all trigger file exports to the same S3 path. Without coordination, they would overwrite each other's outputs.

## Component Setup

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lockstore
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

## Locking on a Resource Identifier

Use the resource being accessed as the lock key:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();
const INSTANCE_ID = require("os").hostname() + "-" + process.pid;

async function exportReport(reportId) {
  const resourceId = `report-export-${reportId}`;

  const lockResp = await client.lock.lock("lockstore", resourceId, INSTANCE_ID, 60);

  if (!lockResp.success) {
    console.log(`Export for ${reportId} already running on another instance`);
    return;
  }

  try {
    console.log(`Exporting report ${reportId}...`);
    await generateAndUploadReport(reportId);
  } finally {
    await client.lock.unlock("lockstore", resourceId, INSTANCE_ID);
    console.log(`Lock released for ${reportId}`);
  }
}
```

## Scenario: Rate-Limited External API

Coordinate calls to an external API that allows only one concurrent request per account:

```javascript
async function callExternalAPI(accountId, payload) {
  const resourceId = `external-api-${accountId}`;

  const lock = await client.lock.lock("lockstore", resourceId, INSTANCE_ID, 15);

  if (!lock.success) {
    throw new Error("External API busy for this account - retry later");
  }

  try {
    return await fetch("https://api.external.com/process", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(r => r.json());
  } finally {
    await client.lock.unlock("lockstore", resourceId, INSTANCE_ID);
  }
}
```

## Coordinating Database Schema Changes

Prevent concurrent schema migrations:

```bash
# Acquire lock before migration
curl -X POST http://localhost:3500/v1.0-alpha1/lock/lockstore \
  -d '{"resourceId":"db-migration","lockOwner":"migrator-pod-1","expiryInSeconds":300}'

# Run migration
npm run migrate

# Release lock
curl -X POST http://localhost:3500/v1.0-alpha1/unlock/lockstore \
  -d '{"resourceId":"db-migration","lockOwner":"migrator-pod-1"}'
```

## Monitoring Lock Contention

Track lock acquisition success rates in your application metrics:

```javascript
const lockAttempts = new Counter("lock_attempts_total");
const lockSuccesses = new Counter("lock_successes_total");

async function lockedOperation(resourceId) {
  lockAttempts.inc({ resource: resourceId });
  const result = await client.lock.lock("lockstore", resourceId, INSTANCE_ID, 30);
  if (result.success) {
    lockSuccesses.inc({ resource: resourceId });
  }
  return result.success;
}
```

## Summary

Dapr distributed locks provide a clean coordination mechanism for shared resource access across microservices. By scoping the `resourceId` to the specific resource being accessed - a report ID, account ID, or migration name - you achieve fine-grained coordination without blocking unrelated operations. Always release locks in `finally` blocks to prevent leaks under error conditions.
