# How to Configure Pub/Sub Broker Replication for Dapr DR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Replication, Disaster Recovery, Kafka

Description: Learn how to configure pub/sub broker replication for Dapr disaster recovery using Kafka MirrorMaker 2 and Redis Streams replication to minimize message loss during regional failover.

---

## Why Pub/Sub Replication Matters for DR

When a regional failure occurs, in-flight messages in your pub/sub broker can be lost if the broker is not replicated. For Dapr applications using pub/sub for critical workflows - such as order processing or payment notifications - message loss during failover can cause data inconsistency. Pub/sub replication ensures messages survive regional outages.

## Kafka Cross-Region Replication with MirrorMaker 2

MirrorMaker 2 replicates Kafka topics from a primary cluster to a DR cluster:

```yaml
# mirrormaker2-config.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaMirrorMaker2
metadata:
  name: dapr-pubsub-mirror
  namespace: kafka-system
spec:
  version: 3.5.0
  replicas: 2
  connectCluster: "dr"
  clusters:
  - alias: "primary"
    bootstrapServers: kafka-primary.us-east.internal:9092
    authentication:
      type: tls
      certificateAndKey:
        secretName: kafka-primary-tls
        certificate: user.crt
        key: user.key
  - alias: "dr"
    bootstrapServers: kafka-dr.us-west.internal:9092
    authentication:
      type: tls
      certificateAndKey:
        secretName: kafka-dr-tls
        certificate: user.crt
        key: user.key
  mirrors:
  - sourceCluster: "primary"
    targetCluster: "dr"
    sourceConnector:
      tasksMax: 4
      config:
        replication.factor: 3
        offset-syncs.topic.replication.factor: 3
        sync.topic.acls.enabled: "false"
        topics: "orders,payments,notifications,inventory"
    checkpointConnector:
      config:
        checkpoints.topic.replication.factor: 3
        sync.group.offsets.enabled: "true"
```

## Configuring Dapr for Failover to DR Broker

Pre-configure a DR pub/sub component in the DR cluster pointing to the replicated Kafka:

```yaml
# DR cluster component - uses replicated topics
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
  annotations:
    dr-failover: "ready"
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-dr.us-west.internal:9092"
  - name: consumerGroup
    value: "production-dr"
  - name: authType
    value: "mtls"
  - name: clientCert
    secretKeyRef:
      name: kafka-dr-tls
      key: user.crt
  - name: clientKey
    secretKeyRef:
      name: kafka-dr-tls
      key: user.key
```

## Consumer Offset Synchronization

Ensure consumer groups resume from the correct offset after failover:

```bash
# Check consumer offset replication
kafka-consumer-groups.sh \
  --bootstrap-server kafka-dr.us-west.internal:9092 \
  --group production-dr \
  --describe

# Verify MirrorMaker 2 is syncing offsets
kafka-console-consumer.sh \
  --bootstrap-server kafka-dr.us-west.internal:9092 \
  --topic primary.checkpoints.internal \
  --from-beginning \
  --max-messages 5
```

## Redis Streams Replication (Lightweight Option)

For simpler use cases using Redis Streams as the pub/sub backend:

```bash
# Configure Redis active-passive replication
redis-cli -h redis-dr.internal REPLICAOF redis-primary.us-east.internal 6379

# Monitor stream replication
redis-cli -h redis-primary.us-east.internal XLEN orders
redis-cli -h redis-dr.internal XLEN orders

# After failover - promote DR to primary
redis-cli -h redis-dr.internal REPLICAOF NO ONE
```

## Failover Testing

Validate that messages are not lost during a simulated failover:

```bash
#!/bin/bash
# test-pubsub-failover.sh

# Publish 100 test messages to primary
for i in $(seq 1 100); do
  curl -X POST "http://primary-dapr:3500/v1.0/publish/pubsub/test-topic" \
    -H "Content-Type: application/json" \
    -d "{\"messageId\": $i, \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
done

echo "Published 100 messages. Waiting 10 seconds for replication..."
sleep 10

# Verify messages appear on DR broker
kafka-console-consumer.sh \
  --bootstrap-server kafka-dr.us-west.internal:9092 \
  --topic primary.test-topic \
  --from-beginning \
  --timeout-ms 5000 \
  --max-messages 100 | wc -l
```

## Summary

Pub/sub broker replication for Dapr DR involves replicating broker topics to a DR region using tools like Kafka MirrorMaker 2 or Redis replication, pre-configuring DR cluster Dapr components to point to the replicated broker, and synchronizing consumer group offsets to prevent message reprocessing after failover. Test the failover procedure regularly by publishing test messages and verifying they are accessible from the DR cluster before any real disaster strikes.
