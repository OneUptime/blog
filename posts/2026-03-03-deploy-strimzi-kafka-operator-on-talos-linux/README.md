# How to Deploy Strimzi Kafka Operator on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Strimzi, Apache Kafka, Kubernetes, Event Streaming

Description: Step-by-step guide to deploying the Strimzi Kafka Operator on Talos Linux for running production-grade Apache Kafka clusters on Kubernetes.

---

Apache Kafka is the backbone of event-driven architectures, handling millions of messages per second for organizations of all sizes. Running Kafka on Kubernetes used to be painful, but the Strimzi operator has changed that. It handles the complexity of deploying, scaling, and managing Kafka clusters as native Kubernetes resources. When you pair Strimzi with Talos Linux, you get an immutable, security-hardened platform running one of the most demanding distributed systems in the data engineering world.

This guide walks through deploying Strimzi on Talos Linux, creating a Kafka cluster, and configuring topics and users.

## Why Strimzi on Talos Linux

Kafka requires careful tuning of disk I/O, networking, and JVM settings. Talos Linux provides a minimal, predictable operating system that reduces the variables you need to worry about. There is no package drift, no unexpected cron jobs, and no SSH sessions where someone might change a kernel parameter. Every node in your Talos cluster is identical, which is exactly what Kafka needs for consistent performance across brokers.

Strimzi manages the entire Kafka lifecycle through custom resources. It handles broker configuration, topic management, user authentication, and even rolling upgrades - all through the Kubernetes API.

## Prerequisites

You will need the following before starting:

- A Talos Linux cluster with at least 3 worker nodes (Kafka needs a minimum of 3 brokers for production)
- Each worker node should have dedicated storage (local SSDs are ideal for Kafka)
- kubectl configured and connected to your cluster
- Helm v3 installed locally
- A StorageClass configured for persistent volumes

## Installing the Strimzi Operator

Deploy Strimzi using the official Helm chart.

```bash
# Add the Strimzi Helm repository
helm repo add strimzi https://strimzi.io/charts/

# Update the repository cache
helm repo update

# Create a namespace for Strimzi
kubectl create namespace kafka

# Install the Strimzi operator
helm install strimzi-kafka-operator \
  strimzi/strimzi-kafka-operator \
  --namespace kafka \
  --set watchAnyNamespace=true
```

Verify the operator is running before proceeding.

```bash
# Check the operator pod status
kubectl get pods -n kafka

# The strimzi-cluster-operator pod should be in Running state
# Also verify the CRDs are installed
kubectl get crds | grep strimzi
```

You should see several CRDs including kafkas, kafkatopics, kafkausers, and kafkaconnects.

## Deploying a Kafka Cluster

Now create a Kafka cluster resource. This manifest defines a 3-broker cluster with ZooKeeper.

```yaml
# kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: production-cluster
  namespace: kafka
spec:
  kafka:
    version: 3.7.0
    replicas: 3
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
      # Replication settings for durability
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      # Performance tuning
      num.partitions: 12
      log.retention.hours: 168
      log.segment.bytes: 1073741824
    storage:
      type: persistent-claim
      size: 100Gi
      class: local-path
      deleteClaim: false
    resources:
      requests:
        memory: 4Gi
        cpu: "2"
      limits:
        memory: 8Gi
        cpu: "4"
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 20Gi
      class: local-path
      deleteClaim: false
    resources:
      requests:
        memory: 1Gi
        cpu: "500m"
      limits:
        memory: 2Gi
        cpu: "1"
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

```bash
# Deploy the Kafka cluster
kubectl apply -f kafka-cluster.yaml

# Watch the deployment progress
kubectl get kafka production-cluster -n kafka -w

# This will take several minutes as it creates:
# 1. ZooKeeper ensemble (3 pods)
# 2. Kafka brokers (3 pods)
# 3. Entity operator (for topics and users)
```

## Talos Linux Storage Configuration

Kafka performance depends heavily on storage. On Talos Linux, you should configure local storage for the best throughput. If your nodes have NVMe drives, configure them in the Talos machine config.

```yaml
# Talos machine config snippet for local storage
machine:
  disks:
    - device: /dev/nvme1n1
      partitions:
        - mountpoint: /var/mnt/kafka
```

You can then use a local PersistentVolume or a CSI driver like OpenEBS LocalPV for Kafka storage. The key is to avoid network-attached storage for Kafka broker data, as the latency will hurt throughput significantly.

## Creating Kafka Topics

With the cluster running, create topics using Strimzi's KafkaTopic resource.

```yaml
# kafka-topic.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: orders
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000
    segment.bytes: 1073741824
    cleanup.policy: delete
    min.insync.replicas: 2
```

```bash
# Create the topic
kubectl apply -f kafka-topic.yaml

# Verify the topic was created
kubectl get kafkatopic -n kafka

# Check topic details
kubectl describe kafkatopic orders -n kafka
```

## Configuring Kafka Users with Authentication

Strimzi can manage Kafka users with SCRAM-SHA-512 or TLS authentication.

```yaml
# kafka-user.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: order-service
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  authentication:
    type: scram-sha-512
  authorization:
    type: simple
    acls:
      # Allow producing to the orders topic
      - resource:
          type: topic
          name: orders
          patternType: literal
        operations:
          - Write
          - Describe
      # Allow consuming from the orders topic
      - resource:
          type: topic
          name: orders
          patternType: literal
        operations:
          - Read
          - Describe
      # Allow the consumer group
      - resource:
          type: group
          name: order-service-group
          patternType: literal
        operations:
          - Read
```

```bash
# Create the Kafka user
kubectl apply -f kafka-user.yaml

# The operator creates a secret with the user's credentials
kubectl get secret order-service -n kafka -o jsonpath='{.data.password}' | base64 -d
```

## Testing the Cluster

Verify your Kafka cluster is working by producing and consuming messages.

```bash
# Run a producer pod
kubectl run kafka-producer -n kafka -it --rm \
  --image=quay.io/strimzi/kafka:0.40.0-kafka-3.7.0 \
  --restart=Never \
  -- bin/kafka-console-producer.sh \
  --broker-list production-cluster-kafka-bootstrap:9092 \
  --topic orders

# In another terminal, run a consumer
kubectl run kafka-consumer -n kafka -it --rm \
  --image=quay.io/strimzi/kafka:0.40.0-kafka-3.7.0 \
  --restart=Never \
  -- bin/kafka-console-consumer.sh \
  --bootstrap-server production-cluster-kafka-bootstrap:9092 \
  --topic orders \
  --from-beginning
```

## Monitoring Kafka on Talos Linux

Strimzi supports exporting Kafka metrics to Prometheus. Add metrics configuration to your Kafka resource.

```yaml
# Add to the kafka-cluster.yaml spec.kafka section
metricsConfig:
  type: jmxPrometheusExporter
  valueFrom:
    configMapKeyRef:
      name: kafka-metrics
      key: kafka-metrics-config.yml
```

Create a ConfigMap with the JMX exporter configuration that maps Kafka MBeans to Prometheus metrics. This integrates well with monitoring tools running on your Talos cluster.

## Wrapping Up

Running Strimzi Kafka on Talos Linux gives you a production-grade event streaming platform on a hardened, immutable operating system. The combination eliminates many of the operational headaches that come with managing Kafka clusters. Strimzi handles broker lifecycle, topic management, and user authentication through the Kubernetes API, while Talos ensures the underlying infrastructure stays consistent and secure. Start with a small cluster, test your workloads, and scale out by simply changing the replica count in your Kafka resource.
