# How to Implement Session Affinity with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Session, Affinity, Microservice

Description: Learn how to implement session affinity using Dapr state management to persist user session data across stateless service replicas in Kubernetes.

---

## What Is Session Affinity in Microservices?

Session affinity means that all requests from the same user hit the same service instance. The classic approach is sticky sessions at the load balancer, but this creates uneven load distribution. Dapr state management offers a better approach: store session data centrally so any replica can serve any request.

## Configure the State Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: session-store
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Writing Session Data on Login

```javascript
const { DaprClient } = require('@dapr/dapr');
const { v4: uuidv4 } = require('uuid');
const client = new DaprClient();

async function createSession(userId, userDetails) {
  const sessionId = uuidv4();
  await client.state.save('session-store', [
    {
      key: `session:${sessionId}`,
      value: {
        userId,
        email: userDetails.email,
        roles: userDetails.roles,
        createdAt: Date.now(),
        lastAccessedAt: Date.now()
      },
      metadata: { ttlInSeconds: '1800' }
    }
  ]);
  return sessionId;
}
```

## Reading Session Data on Each Request

```javascript
async function getSession(sessionId) {
  const session = await client.state.get('session-store', `session:${sessionId}`);
  if (!session) {
    throw new Error('Session expired or not found');
  }

  // Refresh the TTL by re-saving with updated lastAccessedAt
  await client.state.save('session-store', [
    {
      key: `session:${sessionId}`,
      value: { ...session, lastAccessedAt: Date.now() },
      metadata: { ttlInSeconds: '1800' }
    }
  ]);
  return session;
}
```

## Middleware Integration (Express.js)

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());

app.use(async (req, res, next) => {
  const sessionId = req.cookies['session-id'];
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    req.session = await getSession(sessionId);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired' });
  }
});
```

## Invalidating Sessions on Logout

```javascript
async function destroySession(sessionId) {
  await client.state.delete('session-store', `session:${sessionId}`);
}
```

## Storing Multiple Sessions Per User

Track all active sessions for a user to support "log out everywhere":

```javascript
async function invalidateAllUserSessions(userId) {
  const sessionIndex = await client.state.get('session-store', `user:${userId}:sessions`);
  if (sessionIndex) {
    const deleteOps = sessionIndex.map(sid => ({
      operation: 'delete',
      request: { key: `session:${sid}` }
    }));
    await client.state.transaction('session-store', deleteOps);
    await client.state.delete('session-store', `user:${userId}:sessions`);
  }
}
```

## Summary

Replacing sticky sessions with Dapr state management removes the load balancer constraint and allows any service replica to handle any request. TTL-based expiry handles session timeouts automatically, and the uniform state API means you can swap Redis for another store without changing session logic.
