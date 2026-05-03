# How to Deploy Apache Kafka on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Apache Kafka, Kubernetes, Streaming, Helm, Event Streaming

Description: Step-by-step guide to deploying Apache Kafka on Rancher using Helm with KRaft mode, persistent storage, and producer/consumer testing.

## Introduction

Apache Kafka is the industry-standard distributed event streaming platform. Modern Kafka deployments use KRaft mode, eliminating the ZooKeeper dependency and simplifying operations. This guide deploys Kafka on Rancher using the Bitnami Helm chart.

## Prerequisites

- Rancher cluster with at least 3 worker nodes
- `helm` and `kubectl` available
- A StorageClass for persistent volumes

## Step 1: Add Repository

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

## Step 2: Create Values File

```yaml
# kafka-values.yaml

# KRaft mode is the default (and only) mode in modern Bitnami Kafka chart
# releases (chart 32.x / Kafka 4.x), so no ZooKeeper is required.

controller:
  replicaCount: 3   # Three combined controller+broker nodes (controllerOnly: false by default)

  persistence:
    enabled: true
    storageClass: "longhorn"
    size: 50Gi

  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "4Gi"
      cpu: "2"

  # Additional server.properties entries, merged on top of the chart-generated config.
  overrideConfiguration:
    log.retention.hours: 168
    log.retention.bytes: 1073741824
    num.partitions: 3
    default.replication.factor: 3
    min.insync.replicas: 2

# By default the chart enables SASL_PLAINTEXT on the 9092 client listener.
# Switch it to PLAINTEXT so the tutorial commands below work without configuring
# SASL credentials. For production, keep the default SASL_PLAINTEXT (or SASL_SSL)
# and configure clients with the auto-generated credentials.
listeners:
  client:
    protocol: PLAINTEXT

metrics:
  kafka:
    enabled: true    # JMX metrics exporter
  jmx:
    enabled: true
```

## Step 3: Deploy Kafka

```bash
kubectl create namespace messaging

helm install kafka bitnami/kafka \
  --namespace messaging \
  --values kafka-values.yaml
```

## Step 4: Verify the Cluster

```bash
# Check all Kafka pods
kubectl get pods -n messaging -l app.kubernetes.io/name=kafka

# Check controller logs
kubectl logs -n messaging kafka-controller-0
```

## Step 5: Create a Topic

```bash
# Exec into a Kafka pod
kubectl exec -it kafka-controller-0 -n messaging -- bash

# Create a test topic with 3 partitions and replication factor 3
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create \
  --topic test-topic \
  --partitions 3 \
  --replication-factor 3

# Verify topic creation
kafka-topics.sh --bootstrap-server localhost:9092 --list
```

## Step 6: Test Producer and Consumer

```bash
# Start a producer in one terminal
kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic test-topic

# In another terminal, start a consumer
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic test-topic \
  --from-beginning
```

## Step 7: Expose Kafka to Applications

Applications within the cluster connect via the internal service:

```yaml
# Application environment variable
env:
  - name: KAFKA_BOOTSTRAP_SERVERS
    value: "kafka.messaging.svc.cluster.local:9092"
```

## Conclusion

Kafka is now running in KRaft mode on Rancher with a three-broker cluster. The `min.insync.replicas=2` setting ensures durability even if one broker fails. For high-throughput production workloads, tune `num.network.threads` and `num.io.threads` based on your broker's CPU allocation.
