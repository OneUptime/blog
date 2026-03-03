# How to Configure Strimzi Kafka Operator on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Strimzi, Apache Kafka, Kubernetes Operator, Event Streaming, DevOps

Description: Configure the Strimzi Kafka Operator on Talos Linux for automated Kafka cluster management with custom resources and rolling updates.

---

Strimzi is the most popular way to run Apache Kafka on Kubernetes. It provides a set of operators that manage Kafka clusters, topics, users, and connectors through Kubernetes Custom Resources. Instead of manually configuring Kafka brokers, you declare your desired state in YAML and Strimzi makes it happen. On Talos Linux, Strimzi fits perfectly because both embrace the declarative, API-driven approach to infrastructure.

This guide covers installing and configuring Strimzi on Talos Linux, deploying Kafka clusters, and managing topics and users through Custom Resources.

## Why Strimzi on Talos Linux

Managing Kafka manually on Kubernetes is tedious. You need to handle broker configuration, rack awareness, rolling updates, certificate management, and monitoring. Strimzi automates all of this. Combined with Talos Linux's immutable OS, you get a Kafka deployment where both the OS and the application layer are managed declaratively, reducing manual intervention to near zero.

## Prerequisites

- Talos Linux cluster with at least three worker nodes
- `kubectl` installed and configured
- Worker nodes with 4GB+ RAM and SSD storage
- Familiarity with Kafka concepts

## Step 1: Install the Strimzi Operator

```bash
# Create a namespace for Kafka
kubectl create namespace kafka

# Install Strimzi Operator (watches all namespaces)
kubectl create -f https://strimzi.io/install/latest?namespace=kafka

# Verify the operator is running
kubectl get pods -n kafka -l name=strimzi-cluster-operator
```

The operator creates several Custom Resource Definitions (CRDs): Kafka, KafkaTopic, KafkaUser, KafkaConnect, KafkaMirrorMaker2, and more.

## Step 2: Deploy a Kafka Cluster

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
      # Replication settings
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2

      # Log settings
      log.retention.hours: 168
      log.segment.bytes: 1073741824
      log.retention.check.interval.ms: 300000

      # Performance
      num.network.threads: 8
      num.io.threads: 16
      num.partitions: 6
    storage:
      type: persistent-claim
      size: 100Gi
      class: local-path
      deleteClaim: false
    resources:
      requests:
        memory: 4Gi
        cpu: "1"
      limits:
        memory: 4Gi
        cpu: "2"
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
                        - production-cluster-kafka
                topologyKey: kubernetes.io/hostname
    metricsConfig:
      type: jmxPrometheusExporter
      valueFrom:
        configMapKeyRef:
          name: kafka-metrics
          key: kafka-metrics-config.yml

  # ZooKeeper configuration (use KRaft for new deployments)
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
      class: local-path
      deleteClaim: false
    resources:
      requests:
        memory: 1Gi
        cpu: "500m"
      limits:
        memory: 1Gi

  # Entity Operator for topic and user management
  entityOperator:
    topicOperator:
      resources:
        requests:
          memory: 256Mi
          cpu: "100m"
    userOperator:
      resources:
        requests:
          memory: 256Mi
          cpu: "100m"
```

```bash
kubectl apply -f kafka-cluster.yaml

# Watch the cluster deployment
kubectl get pods -n kafka -w
```

## Step 3: Deploy with KRaft Mode (No ZooKeeper)

For newer deployments, use KRaft mode to eliminate ZooKeeper:

```yaml
# kafka-kraft.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: combined
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  replicas: 3
  roles:
    - controller
    - broker
  storage:
    type: persistent-claim
    size: 100Gi
    class: local-path
---
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: production-cluster
  namespace: kafka
  annotations:
    strimzi.io/kraft: enabled
    strimzi.io/node-pools: enabled
spec:
  kafka:
    version: 3.7.0
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
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

## Step 4: Manage Topics with Custom Resources

```yaml
# kafka-topics.yaml
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
    retention.ms: "604800000"
    segment.bytes: "1073741824"
    cleanup.policy: "delete"
    min.insync.replicas: "2"
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: user-events
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: "2592000000"
    cleanup.policy: "compact,delete"
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: notifications
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  partitions: 3
  replicas: 3
  config:
    retention.ms: "86400000"
```

```bash
kubectl apply -f kafka-topics.yaml

# List all managed topics
kubectl get kafkatopics -n kafka
```

## Step 5: Manage Users and ACLs

```yaml
# kafka-users.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: order-service
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      - resource:
          type: topic
          name: orders
          patternType: literal
        operations:
          - Read
          - Write
          - Describe
      - resource:
          type: group
          name: order-service-group
          patternType: literal
        operations:
          - Read
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: analytics-consumer
  namespace: kafka
  labels:
    strimzi.io/cluster: production-cluster
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      - resource:
          type: topic
          name: "*"
          patternType: literal
        operations:
          - Read
          - Describe
      - resource:
          type: group
          name: analytics-
          patternType: prefix
        operations:
          - Read
```

```bash
kubectl apply -f kafka-users.yaml

# Check user certificates
kubectl get secret order-service -n kafka -o yaml
```

## Step 6: Configure Kafka Metrics

```yaml
# kafka-metrics-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-metrics
  namespace: kafka
data:
  kafka-metrics-config.yml: |
    lowercaseOutputName: true
    rules:
      - pattern: kafka.server<type=(.+), name=(.+), clientId=(.+), topic=(.+), partition=(.*)><>Value
        name: kafka_server_$1_$2
        type: GAUGE
        labels:
          clientId: "$3"
          topic: "$4"
          partition: "$5"
      - pattern: kafka.server<type=(.+), name=(.+), clientId=(.+), brokerHost=(.+), brokerPort=(.+)><>Value
        name: kafka_server_$1_$2
        type: GAUGE
        labels:
          clientId: "$3"
          broker: "$4:$5"
      - pattern: kafka.server<type=(.+), name=(.+)><>Value
        name: kafka_server_$1_$2
        type: GAUGE
```

```bash
kubectl apply -f kafka-metrics-config.yaml
```

## Step 7: Test the Cluster

```bash
# Produce messages
kubectl run kafka-producer --rm -it --restart=Never \
  --image=quay.io/strimzi/kafka:latest-kafka-3.7.0 \
  --namespace=kafka \
  -- bin/kafka-console-producer.sh \
  --bootstrap-server production-cluster-kafka-bootstrap:9092 \
  --topic orders

# Consume messages
kubectl run kafka-consumer --rm -it --restart=Never \
  --image=quay.io/strimzi/kafka:latest-kafka-3.7.0 \
  --namespace=kafka \
  -- bin/kafka-console-consumer.sh \
  --bootstrap-server production-cluster-kafka-bootstrap:9092 \
  --topic orders --from-beginning --group test-group
```

## Rolling Updates and Upgrades

Strimzi handles rolling updates automatically when you change the Kafka CR:

```bash
# Update Kafka version
kubectl patch kafka production-cluster -n kafka --type merge -p '
  {"spec": {"kafka": {"version": "3.7.1"}}}'

# Monitor the rolling update
kubectl get pods -n kafka -w
```

Strimzi will update brokers one at a time, waiting for each to rejoin the cluster before proceeding.

## Conclusion

Strimzi on Talos Linux is the most maintainable way to run Kafka in production. The operator handles the heavy lifting of cluster management, certificate rotation, rolling updates, and topic administration through Kubernetes-native Custom Resources. Combined with Talos Linux's immutable OS, you get a Kafka deployment that is both declarative and secure. The key advantage is that everything from the OS configuration to Kafka topics is defined in version-controlled YAML, making your entire messaging infrastructure reproducible and auditable.
