# How to Configure Message Queue High Availability in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Message Queue, High Availability, RabbitMQ, Kafka

Description: Configure high availability for message queue deployments in Rancher using quorum queues, replication, and pod anti-affinity rules to ensure zero message loss.

## Introduction

Message queue high availability ensures that your messaging infrastructure remains operational even when individual nodes fail. Different message queue systems provide different HA mechanisms: RabbitMQ uses quorum queues, Kafka uses partition replication, and NATS JetStream uses stream replication. This guide covers implementing HA for the most common message queues on Rancher.

## Prerequisites

- Rancher-managed cluster with at least 3 nodes
- Message queue deployments (RabbitMQ, Kafka, or NATS)
- kubectl access

## Section 1: RabbitMQ High Availability

### Configure Quorum Queues (Recommended)

Quorum queues provide Raft-based consensus for replicated, durable message storage:

```yaml
# rabbitmq-ha-cluster.yaml - High availability RabbitMQ

apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq-ha
  namespace: messaging
spec:
  replicas: 3

  rabbitmq:
    additionalConfig: |
      # Use quorum queues by default
      default_queue_type = quorum

      # Quorum queue settings
      quorum_queue.initial_cluster_size = 3

      # Prevent minority partitions from accepting writes
      cluster_partition_handling = pause_minority

      # Network partition detection
      net_ticktime = 60

  # Spread across nodes using anti-affinity
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/name: rabbitmq-ha
          topologyKey: kubernetes.io/hostname

  # Tolerate node failures
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: kubernetes.io/hostname
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app.kubernetes.io/name: rabbitmq-ha
```

### Create Quorum Queue with API

```bash
# After port-forwarding the RabbitMQ management service to localhost
# kubectl port-forward -n messaging service/rabbitmq-ha 15672:15672

# Create quorum queue with proper HA settings
curl -s -u admin:AdminP@ss \
  -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:15672/api/queues/%2F/orders-ha \
  -d '{
    "durable": true,
    "arguments": {
      "x-queue-type": "quorum",
      "x-quorum-initial-group-size": 3,
      "x-delivery-limit": 5
    }
  }'
```

## Section 2: Apache Kafka High Availability

### Configure Kafka Replication

Current Strimzi releases use KRaft-based clusters instead of ZooKeeper:

```yaml
# kafka-ha-cluster.yaml - Kafka with HA configuration
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: kafka-ha
  namespace: kafka
spec:
  kafka:
    version: 4.2.0
    metadataVersion: 4.2
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      # Minimum in-sync replicas for durability
      min.insync.replicas: 2
      default.replication.factor: 3
      # Replication factors for internal topics
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      # Leader election timeout
      leader.imbalance.check.interval.seconds: 300
      # Unclean leader election (set to false for safety)
      unclean.leader.election.enable: false
      # Log replication
      log.recovery.threads.per.data.dir: 2

    # Anti-affinity to spread brokers across nodes
    template:
      pod:
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchExpressions:
                    - key: strimzi.io/name
                      operator: In
                      values:
                        - kafka-ha-kafka
                topologyKey: kubernetes.io/hostname

  entityOperator:
    topicOperator: {}
    userOperator: {}

  kafkaExporter: {}
---
apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: kafka
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-ha
spec:
  replicas: 3
  roles:
    - controller
    - broker
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 100Gi
        class: standard
        deleteClaim: false
```

### Create HA Topics

```yaml
# kafka-ha-topic.yaml - Highly available Kafka topic
apiVersion: kafka.strimzi.io/v1
kind: KafkaTopic
metadata:
  name: orders-ha
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-ha
spec:
  partitions: 12
  replicas: 3        # All 3 brokers hold a copy
  config:
    # Require all in-sync replicas to acknowledge
    min.insync.replicas: "2"
    # Keep messages for 7 days
    retention.ms: "604800000"
    # Disable unclean leader election for this topic
    unclean.leader.election.enable: "false"
```

## Section 3: NATS JetStream High Availability

```yaml
# nats-ha-values.yaml - NATS cluster with JetStream HA
config:
  cluster:
    enabled: true
    replicas: 3

  jetstream:
    enabled: true
    fileStore:
      enabled: true
      pvc:
        enabled: true
        size: 20Gi

# Spread NATS pods across nodes
podTemplate:
  topologySpreadConstraints:
    kubernetes.io/hostname:
      maxSkew: 1
      whenUnsatisfiable: DoNotSchedule
```

Configure HA stream:

```bash
# Create a stream with replication factor 3
nats --server nats://nats.messaging.svc.cluster.local:4222 stream add ORDERS \
  --subjects "orders.*" \
  --storage file \
  --replicas 3 \
  --retention limits \
  --max-age 7d
```

## Section 4: Cross-Region Message Queue Disaster Recovery

```yaml
# cross-region-dr.yaml - Multi-region message queue setup
# RabbitMQ Federation for cross-cluster disaster recovery
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq-region-a
  namespace: messaging
spec:
  replicas: 3
  rabbitmq:
    additionalPlugins:
      - rabbitmq_federation
      - rabbitmq_federation_management
    additionalConfig: |
      # Configure federation policies and upstreams to replicate
      # critical exchanges or queues to region B asynchronously
```

## Section 5: Monitoring Queue Health

```yaml
# mq-ha-alerts.yaml - Alerts for message queue HA health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mq-ha-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: rabbitmq-ha
      rules:
        # Requires Prometheus to scrape RabbitMQ /metrics/detailed?family=ra_metrics
        - alert: RabbitMQRaftReplicationFailures
          expr: |
            rate(rabbitmq_detailed_raft_aer_replies_fail[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "RabbitMQ is reporting failed Raft append-entry replies"

        # Adjust the job label to match your RabbitMQ scrape target
        - alert: RabbitMQNodeDown
          expr: |
            up{job="rabbitmq"} == 0
          for: 1m
          labels:
            severity: warning
          annotations:
            summary: "RabbitMQ node {{ $labels.instance }} is down"

    - name: kafka-ha
      rules:
        # Requires Kafka Exporter metrics
        - alert: KafkaUnderReplicatedPartitions
          expr: |
            sum(kafka_topic_partition_under_replicated_partition) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Kafka has under-replicated partitions"

        # Requires Kafka Exporter metrics
        - alert: KafkaUnderMinISR
          expr: |
            count(kafka_topic_partition_in_sync_replica < 2) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Kafka partitions have dropped below the configured minimum ISR"
```

## Section 6: Pod Disruption Budgets

```yaml
# pdb-mq.yaml - If you manage PDBs manually, ensure minimum availability during maintenance
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: rabbitmq-pdb
  namespace: messaging
spec:
  # At least 2 of 3 RabbitMQ nodes must remain available
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: rabbitmq-ha
---
# When Strimzi automatic PodDisruptionBudget generation is disabled
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: kafka-pdb
  namespace: kafka
spec:
  minAvailable: 2
  selector:
    matchLabels:
      strimzi.io/name: kafka-ha-kafka
```

## Conclusion

Message queue high availability on Rancher requires a combination of application-level replication (quorum queues, Kafka replication), Kubernetes scheduling controls (pod anti-affinity), and Pod Disruption Budgets. Always test your HA configuration by simulating node failures before relying on it in production. Monitor queue depths, replication lag, and node health, and set up alerting for conditions like Raft replication failures, under-replicated partitions, or reduced in-sync replicas that indicate your HA guarantees are at risk.
