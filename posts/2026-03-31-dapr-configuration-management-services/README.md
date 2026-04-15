# How to Implement Configuration Management for Dapr Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Configuration, Microservice, Kubernetes, Redis

Description: Learn how to implement centralized configuration management for Dapr services using the Configuration API with Redis, subscriptions, and dynamic updates.

---

## Overview

Dapr's Configuration API provides a unified way for microservices to access and subscribe to configuration data. Instead of each service managing its own config files or environment variables, you centralize settings in a configuration store and let Dapr handle distribution.

## Setting Up a Configuration Store

First, configure a Redis-backed configuration component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
  namespace: default
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master.default.svc.cluster.local:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

Apply this to your cluster:

```bash
kubectl apply -f config-store.yaml
```

## Reading Configuration Values

From your service, retrieve config values via the Dapr HTTP API:

```bash
curl http://localhost:3500/v1.0/configuration/configstore?key=featureFlag&key=timeout
```

In a Node.js service:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function getConfig() {
  const config = await client.configuration.get('configstore', ['featureFlag', 'timeout']);
  console.log('Feature flag:', config.items['featureFlag'].value);
  console.log('Timeout:', config.items['timeout'].value);
}
```

## Subscribing to Configuration Changes

Enable your service to react to live config changes without restarting:

```javascript
async function watchConfig() {
  const stream = await client.configuration.subscribeWithKeys(
    'configstore',
    ['featureFlag', 'maxRetries'],
    (configUpdate) => {
      console.log('Config updated:', configUpdate.items);
      applyNewConfig(configUpdate.items);
    }
  );
  return stream;
}
```

## Seeding Configuration in Redis

Pre-populate your Redis config store with initial values:

```bash
redis-cli MSET featureFlag "true||1" timeout "30||1" maxRetries "3||1"
```

## Environment-Specific Configuration

Use Dapr's namespace support to isolate configuration per environment:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
  namespace: production
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: prod-redis:6379
  - name: redisDB
    value: "1"
```

## Unsubscribing

Always clean up subscriptions when your service shuts down:

```javascript
process.on('SIGTERM', async () => {
  stream.stop();
  await client.stop();
});
```

## Summary

Dapr's Configuration API centralizes configuration management across microservices, eliminating the need for per-service config handling. By using Redis as the configuration store and leveraging subscriptions, services can react to configuration changes in real time without restarts. This pattern simplifies operations and reduces configuration drift across distributed systems.
