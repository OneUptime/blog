# How to Use Dapr Configuration with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, Configuration API, Real-Time Configuration, Microservice

Description: Learn how to configure and use Redis as a Dapr configuration store backend, including setup, key management, and subscription to live updates.

---

Redis is the most commonly used backend for the Dapr Configuration API. Its keyspace notification feature enables real-time change subscriptions, and its speed makes it ideal for configuration values that services read frequently. This guide covers the complete setup from Redis configuration to application usage.

## Configure Redis for Keyspace Notifications

The Dapr configuration store requires Redis keyspace notifications to be enabled for subscriptions to work:

```bash
# Connect to Redis and enable keyspace notifications
redis-cli CONFIG SET notify-keyspace-events "KEA"
```

The flags mean:
- `K` - Keyspace events
- `E` - Keyevent events
- `A` - Alias for `g$lshztdxe` (covers generic, string, list, set, hash, sorted set, stream, expired, and evicted events)

For persistent Redis configuration:

```bash
# In redis.conf
notify-keyspace-events KEA
```

Or via Kubernetes ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    notify-keyspace-events KEA
    maxmemory-policy allkeys-lru
```

## Deploy Redis on Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-config-store
  namespace: production
spec:
  selector:
    matchLabels:
      app: redis-config
  template:
    metadata:
      labels:
        app: redis-config
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          args: ["--notify-keyspace-events", "KEA"]
          ports:
            - containerPort: 6379
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
```

## Configure the Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: appconfig
  namespace: production
spec:
  type: configuration.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-config-store.production.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-config-secret
        key: password
    - name: enableTLS
      value: "false"
    - name: redisMaxRetries
      value: "3"
```

## Populating Configuration Keys

Configuration keys are stored as plain keys in Redis. The value format is `<value>||<version>`, where the version is an integer used for tracking changes:

```bash
# Set configuration values (format: key "value||version")
redis-cli MSET max-retry-count "3||1" payment-timeout-ms "5000||1" fraud-check-enabled "true||1" currency-precision "2||1"
```

You can also set keys individually:

```bash
redis-cli SET log-level "info||1"
redis-cli SET tracing-enabled "true||1"
```

## Reading Configuration

```bash
# HTTP API
curl "http://localhost:3500/v1.0/configuration/appconfig?key=max-retry-count"
```

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

const config = await client.configuration.get('appconfig', [
  'max-retry-count',
  'payment-timeout-ms',
  'fraud-check-enabled'
]);

const maxRetries = parseInt(config.items['max-retry-count'].value);
const timeout = parseInt(config.items['payment-timeout-ms'].value);
const fraudCheck = config.items['fraud-check-enabled'].value === 'true';
```

## Monitoring Redis Configuration Health

Check that the Redis configuration store is healthy:

```bash
# Verify keyspace notifications are enabled
redis-cli CONFIG GET notify-keyspace-events

# Check key count
redis-cli DBSIZE

# Monitor configuration changes in real time
redis-cli SUBSCRIBE "__keyevent@0__:set"
```

## Summary

Using Redis as a Dapr configuration store requires enabling keyspace notifications (`KEA`) for subscription support, defining a Dapr component pointing to your Redis instance, and storing configuration values in the `<value>||<version>` format. Once configured, your services get fast configuration reads and real-time push notifications whenever values change.
