# How to Optimize Dapr State Store Read Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Performance, State Store, Read, Caching

Description: Improve Dapr state store read performance using bulk get operations, application-level caching, read replicas, and query optimization for high-read workloads.

---

## Overview

State store reads in Dapr go through the sidecar proxy, adding a small overhead per operation. For high-read services, optimizing the read path through bulk operations, caching, and backend tuning can dramatically reduce latency and backend load.

## Using Bulk State Get

Retrieve multiple state entries in a single API call instead of making sequential requests:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

// Inefficient: sequential reads
async function getOrdersSequential(orderIds) {
  const orders = [];
  for (const id of orderIds) {
    const order = await client.state.get('statestore', `order:${id}`);
    if (order) orders.push(JSON.parse(order));
  }
  return orders;
}

// Efficient: bulk read
async function getOrdersBulk(orderIds) {
  const keys = orderIds.map(id => `order:${id}`);
  const results = await client.state.getBulk('statestore', keys);
  return results
    .filter(r => r.data)
    .map(r => JSON.parse(r.data));
}
```

## Application-Level Caching

Cache frequently read state in memory to avoid repeated state store round-trips:

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

async function getCachedState(key) {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const value = await client.state.get('statestore', key);
  const parsed = value ? JSON.parse(value) : null;

  if (parsed) {
    cache.set(key, parsed);
  }

  return parsed;
}

async function invalidateCache(key) {
  cache.del(key);
}
```

## Using State Store Queries for Bulk Retrieval

For supported state stores (Redis, MongoDB), use the query API to retrieve multiple records:

```javascript
const query = {
  filter: {
    AND: [
      { EQ: { status: 'active' } },
      { IN: { region: ['us-east', 'us-west'] } }
    ]
  },
  sort: [{ key: 'createdAt', order: 'DESC' }],
  page: { limit: 100 }
};

const results = await client.state.query('statestore', query);
console.log(`Found ${results.results.length} records`);
```

## Redis State Store Read Optimization

For Redis-backed state stores, configure read-through settings:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisMaxRetries
    value: "3"
  - name: redisMaxRetryInterval
    value: "2s"
  - name: enableTLS
    value: "false"
  - name: poolSize
    value: "20"
```

## Parallel State Reads

For independent state reads, use `Promise.all` to parallelize them:

```javascript
async function getOrderWithDetails(orderId) {
  const [order, customer, inventory] = await Promise.all([
    client.state.get('statestore', `order:${orderId}`),
    client.state.get('statestore', `customer:${orderId}`),
    client.state.get('statestore', `inventory:${orderId}`)
  ]);

  return {
    order: order ? JSON.parse(order) : null,
    customer: customer ? JSON.parse(customer) : null,
    inventory: inventory ? JSON.parse(inventory) : null
  };
}
```

## Monitoring Read Latency

Track state store read performance with Dapr metrics:

```bash
# Query Dapr state store latency histogram
curl http://localhost:9090/metrics | grep dapr_component_state_latencies_bucket

# Check p99 read latency
# dapr_component_state_latencies_bucket{component="statestore",le="25"} / total
```

## Summary

Dapr state store read performance improves significantly by switching from sequential reads to bulk get operations, adding application-level caching for hot keys, parallelizing independent reads with `Promise.all`, and tuning the Redis connection pool size for high-concurrency workloads. Use Dapr's Prometheus metrics to establish baseline latency measurements and validate improvements after each optimization.
