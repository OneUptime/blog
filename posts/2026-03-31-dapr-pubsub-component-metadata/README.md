# How to Configure Pub/Sub Component Metadata in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Component, Configuration, Metadata

Description: Learn how to configure pub/sub component metadata in Dapr for Kafka, RabbitMQ, and Redis, including authentication, tuning, and secret references.

---

## Understanding Component Metadata

Every Dapr pub/sub component is configured through a YAML file containing a `metadata` section. Metadata fields control connection strings, authentication, consumer group names, retry behavior, and broker-specific tuning parameters.

## Kafka Component Metadata

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka-1:9092,kafka-2:9092
  - name: consumerGroup
    value: order-consumers
  - name: initialOffset
    value: newest        # newest or oldest
  - name: maxMessageBytes
    value: "1048576"     # 1MB
  - name: authType
    value: "password"
  - name: saslUsername
    secretKeyRef:
      name: kafka-secret
      key: username
  - name: saslPassword
    secretKeyRef:
      name: kafka-secret
      key: password
  - name: saslMechanism
    value: SHA-256
```

## RabbitMQ Component Metadata

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: amqp://rabbitmq:5672
  - name: durable
    value: "true"         # Persist messages to disk
  - name: deletedWhenUnused
    value: "false"        # Keep queue when consumers disconnect
  - name: autoAck
    value: "false"        # Manual acknowledgment
  - name: reconnectWait
    value: "5"            # Seconds between reconnect attempts
  - name: concurrencyMode
    value: parallel       # parallel or single
  - name: maxLen
    value: "10000"        # Max messages in queue
  - name: exchangeKind
    value: fanout         # direct, fanout, topic, or headers
```

## Redis Streams Component Metadata

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: consumerID
    value: consumer-1
  - name: enableTLS
    value: "false"
  - name: processingTimeout
    value: "60"           # Seconds before message reclaimed
  - name: redeliverInterval
    value: "2"            # Seconds between redelivery checks
  - name: maxLenApprox
    value: "1000"         # Max stream length (approximate)
```

## Using Kubernetes Secrets for Credentials

Store sensitive metadata in Kubernetes secrets:

```bash
kubectl create secret generic kafka-secret \
  --from-literal=username=myuser \
  --from-literal=password=mypassword
```

Reference them in the component:

```yaml
metadata:
- name: saslPassword
  secretKeyRef:
    name: kafka-secret
    key: password
```

## Referencing a Custom Secret Store

```yaml
auth:
  secretStore: vault  # Use HashiCorp Vault instead of Kubernetes secrets
```

## Validating Component Metadata

Check loaded components and their status via the Dapr metadata API:

```bash
curl http://localhost:3500/v1.0/metadata | jq '.components'
```

If a component fails to load due to metadata errors, the response will omit it and Dapr logs will contain the error.

## Summary

Dapr pub/sub component metadata controls every aspect of broker connectivity and behavior. Use secret references for credentials, tune parameters like consumer group names and message sizes for your workload, and validate loaded components through the metadata API to catch configuration errors early.
