# How to Migrate from In-Memory Cache to Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Cache, Migration, Distributed System

Description: Learn how to replace in-process in-memory caches with Dapr State Management to share state across service replicas and survive pod restarts.

---

## The In-Memory Cache Problem

An in-memory cache (like a plain `Map` or `Dictionary`) is fast but instance-local. When you scale to three replicas, each has its own cache - a request routed to replica 2 misses data written by replica 1. Dapr State Management externalizes state to a shared store while keeping the same simple get/set API.

## Before: In-Memory Map

```javascript
// session-service.js - in-memory
const sessions = new Map();

function createSession(userId, data) {
  const sessionId = generateId();
  sessions.set(sessionId, {
    userId,
    data,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600_000 // 1 hour
  });
  return sessionId;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}
```

## After: Dapr State Management

Configure a state store component:

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sessionstore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: ttlInSeconds
    value: "3600"
```

Refactored service:

```javascript
// session-service.js - via Dapr
const axios = require('axios');

const DAPR_PORT = process.env.DAPR_HTTP_PORT || 3500;
const STATE_URL = `http://localhost:${DAPR_PORT}/v1.0/state/sessionstore`;

async function createSession(userId, data) {
  const sessionId = generateId();
  await axios.post(STATE_URL, [
    {
      key: sessionId,
      value: { userId, data, createdAt: Date.now() },
      metadata: { ttlInSeconds: '3600' }
    }
  ]);
  return sessionId;
}

async function getSession(sessionId) {
  const response = await axios.get(`${STATE_URL}/${sessionId}`);
  if (response.status === 204) return null; // not found
  return response.data;
}

async function deleteSession(sessionId) {
  await axios.delete(`${STATE_URL}/${sessionId}`);
}
```

## Using the Dapr SDK

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function createSession(userId, data) {
  const sessionId = generateId();
  await client.state.save('sessionstore', [
    {
      key: sessionId,
      value: { userId, data, createdAt: Date.now() },
      metadata: { ttlInSeconds: '3600' }
    }
  ]);
  return sessionId;
}

async function getSession(sessionId) {
  return await client.state.get('sessionstore', sessionId);
}
```

## Bulk Operations

```javascript
// Read multiple sessions at once
const sessions = await client.state.getBulk('sessionstore', [
  'session-001',
  'session-002',
  'session-003'
]);
```

## Optimistic Concurrency

Dapr State Management supports ETags for optimistic locking:

```javascript
// Get with ETag
const resp = await axios.get(`${STATE_URL}/session-001`);
const etag = resp.headers['etag'];

// Update only if ETag matches (prevents lost updates)
await axios.post(STATE_URL, [
  {
    key: 'session-001',
    value: newValue,
    etag: etag,
    options: {
      concurrency: 'first-write'
    }
  }
]);
```

## Summary

Replacing an in-memory Map with Dapr State Management makes session and cache data visible across all service replicas without changing your business logic structure. Configure a Redis state store component, replace direct Map calls with Dapr HTTP/SDK calls, and all pods read from the same external store. TTL support, bulk operations, and ETags cover the most common cache patterns.
