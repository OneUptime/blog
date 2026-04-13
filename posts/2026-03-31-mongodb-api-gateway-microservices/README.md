# How to Implement API Gateway with MongoDB for Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, API Gateway, Microservice, Routing, Authentication

Description: Learn how to use MongoDB as a configuration store for an API gateway in a microservices architecture, managing routes, rate limits, and auth tokens.

---

An API gateway is the single entry point for all client requests in a microservices architecture. MongoDB is well-suited as a dynamic configuration store for API gateway rules - route definitions, rate limit policies, API keys, and service registries can all be stored and updated without redeploying the gateway.

## MongoDB as a Dynamic Configuration Store

Static gateway configurations require restarts when routes change. By storing configuration in MongoDB, the gateway can reload rules dynamically:

```javascript
// Load routes from MongoDB at startup and watch for changes
async function loadRoutes(db) {
  const routes = await db.collection('routes').find({ enabled: true }).toArray();
  return routes;
}

async function watchRouteChanges(db, routeRegistry) {
  const stream = db.collection('routes').watch();
  stream.on('change', async () => {
    const updatedRoutes = await loadRoutes(db);
    routeRegistry.reload(updatedRoutes);
    console.log('Routes reloaded from MongoDB');
  });
}
```

## Route Configuration Schema

Store route definitions with upstream targets, path patterns, and middleware settings:

```javascript
// Insert a route definition
await db.collection('routes').insertOne({
  path: '/api/orders',
  method: 'POST',
  upstream: 'http://order-service:3000',
  rateLimit: { requests: 100, windowSeconds: 60 },
  authRequired: true,
  enabled: true,
  createdAt: new Date()
});
```

## API Key Authentication with MongoDB

Store and validate API keys using MongoDB for fast lookups. Use an index on the key field:

```javascript
// Create index for fast API key lookups
await db.collection('api_keys').createIndex({ key: 1 }, { unique: true });

// Validate API key middleware
async function authenticateApiKey(req, res, next, db) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing API key' });

  const keyDoc = await db.collection('api_keys').findOne({
    key: apiKey,
    enabled: true,
    expiresAt: { $gt: new Date() }
  });

  if (!keyDoc) return res.status(403).json({ error: 'Invalid or expired API key' });

  req.serviceId = keyDoc.serviceId;
  next();
}
```

## Rate Limiting with MongoDB

Implement fixed window rate limiting using MongoDB's TTL indexes and atomic increment:

```javascript
async function checkRateLimit(db, clientId, limit, windowSeconds) {
  const key = `${clientId}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

  const result = await db.collection('rate_limits').findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: 'after' }
  );

  return result.count <= limit;
}

// TTL index to auto-expire rate limit counters
await db.collection('rate_limits').createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 120 }
);
```

## Request Logging and Analytics

Log all gateway requests to MongoDB for analytics and debugging:

```javascript
async function logRequest(db, req, res, upstream, durationMs) {
  await db.collection('request_logs').insertOne({
    path: req.path,
    method: req.method,
    upstream,
    statusCode: res.statusCode,
    durationMs,
    clientIp: req.ip,
    apiKey: req.headers['x-api-key'] ?? null,
    timestamp: new Date()
  });
}
```

Use TTL indexes to automatically prune old logs:

```javascript
await db.collection('request_logs').createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 2592000 }  // 30 days
);
```

## Service Registry for Dynamic Discovery

Store service health and addresses in MongoDB so the gateway can route to healthy instances:

```javascript
async function getHealthyUpstream(db, serviceName) {
  const instance = await db.collection('service_registry').findOne({
    serviceName,
    healthy: true,
    lastHeartbeat: { $gt: new Date(Date.now() - 30000) }  // heartbeat within 30s
  });

  return instance?.address ?? null;
}
```

## Summary

MongoDB serves as a flexible backend for API gateway configuration, enabling dynamic route management, API key authentication, rate limiting, and service discovery without gateway restarts. Change streams allow the gateway to react to configuration changes in real time, while TTL indexes keep request logs and rate limit counters automatically pruned. This approach provides a database-driven gateway that scales and adapts as your microservices architecture evolves.
