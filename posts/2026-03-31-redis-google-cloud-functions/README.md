# How to Use Redis with Google Cloud Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Google Cloud, Serverless

Description: Learn how to connect Google Cloud Functions to Redis Memorystore for caching and state sharing, including VPC connector setup and connection reuse best practices.

---

Google Cloud Functions run inside Google's network, but they cannot reach Memorystore Redis directly without a VPC connector. Once connectivity is established, the same connection reuse patterns from traditional serverless development apply.

## Create a Redis Instance on Memorystore

```bash
gcloud redis instances create my-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0
```

Get the host IP:

```bash
gcloud redis instances describe my-redis --region=us-central1 \
  --format="value(host)"
```

## Set Up a VPC Connector

Cloud Functions need a Serverless VPC Access connector to reach Memorystore:

```bash
gcloud compute networks vpc-access connectors create redis-connector \
  --network=default \
  --region=us-central1 \
  --range=10.8.0.0/28
```

## Write the Cloud Function

Use connection reuse at module scope:

```javascript
const { createClient } = require('redis');

let redisClient;

async function getClient() {
  if (!redisClient || !redisClient.isOpen) {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: 6379
      }
    });
    await redisClient.connect();
  }
  return redisClient;
}

exports.handleRequest = async (req, res) => {
  const redis = await getClient();
  const key = `cache:${req.path}`;

  const hit = await redis.get(key);
  if (hit) {
    return res.status(200).json(JSON.parse(hit));
  }

  const data = await fetchData(req.path);
  await redis.setEx(key, 120, JSON.stringify(data));
  res.status(200).json(data);
};
```

## Deploy with VPC Connector

```bash
gcloud functions deploy handleRequest \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --vpc-connector=redis-connector \
  --egress-settings=all-traffic \
  --set-env-vars REDIS_HOST=10.0.0.3 \
  --region=us-central1
```

## Using Redis for Function State

Store idempotency keys to prevent duplicate processing:

```javascript
exports.processEvent = async (req, res) => {
  const redis = await getClient();
  const idempotencyKey = `processed:${req.body.eventId}`;

  const alreadyProcessed = await redis.exists(idempotencyKey);
  if (alreadyProcessed) {
    return res.status(200).json({ status: 'already processed' });
  }

  await processBusinessLogic(req.body);
  await redis.setEx(idempotencyKey, 86400, '1');
  res.status(200).json({ status: 'ok' });
};
```

## Verify Connectivity

Test from a Compute Engine VM in the same VPC network that Redis is reachable:

```bash
redis-cli -h 10.0.0.3 -p 6379 ping
# PONG
```

## Summary

Google Cloud Functions connect to Memorystore Redis through a Serverless VPC Access connector. Initializing the Redis client at module load time allows connection reuse across warm function instances, reducing latency and avoiding connection exhaustion. Redis is valuable for caching, idempotency tracking, and rate limiting within Cloud Functions workloads.
