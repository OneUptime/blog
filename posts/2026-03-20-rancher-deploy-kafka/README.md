# How to Deploy Apache Kafka on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Kafka, Message Queue, Streaming, Strimzi

Description: Deploy Apache Kafka on Rancher-managed Kubernetes clusters using the Strimzi Kafka Operator for distributed event streaming and message processing.

## Introduction

Apache Kafka is a distributed event streaming platform used by thousands of companies for high-throughput, fault-tolerant message processing. The Strimzi operator provides Kubernetes-native management of Kafka clusters, simplifying deployment, configuration, and operations. This guide covers deploying a production Kafka cluster on Rancher using Strimzi.

## Prerequisites

- Rancher-managed Kubernetes 1.30+ cluster with at least 3 nodes
- Helm 3.x installed
- kubectl with cluster-admin access
- A StorageClass for persistent volumes

## Step 1: Install Strimzi Operator

```bash
# Install Strimzi Kafka Operator via Helm

helm install strimzi-cluster-operator oci://quay.io/strimzi-helm/strimzi-kafka-operator \
  --version 0.51.0 \
  --namespace kafka \
  --create-namespace \
  --wait

# Verify the operator is running
kubectl get deployment strimzi-cluster-operator -n kafka
```

## Step 2: Deploy Kafka Cluster

```yaml
# kafka-cluster.yaml - Production Kafka cluster with Strimzi in KRaft mode
#
# Create the kafka-metrics ConfigMap from Step 7 before applying this resource.
apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: controllers
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-prod
spec:
  replicas: 3
  roles:
    - controller
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 10Gi
        class: standard
        deleteClaim: false
  resources:
    requests:
      memory: 1Gi
      cpu: 500m
---
apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: brokers
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-prod
spec:
  replicas: 3
  roles:
    - broker
  storage:
    type: jbod
    volumes:
      - id: 0
        type: persistent-claim
        size: 100Gi
        class: standard
        deleteClaim: false
  resources:
    requests:
      memory: 4Gi
      cpu: "1"
    limits:
      memory: 8Gi
      cpu: "4"
  jvmOptions:
    -Xms: 2048m
    -Xmx: 4096m
    -XX:
      UseG1GC: true
      MaxGCPauseMillis: 20
      InitiatingHeapOccupancyPercent: 35
---
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: kafka-prod
  namespace: kafka
  annotations:
    strimzi.io/kraft: enabled
    strimzi.io/node-pools: enabled
spec:
  kafka:
    version: 4.2.0

    listeners:
      - name: tls
        port: 9093
        type: internal
        tls: true
        authentication:
          type: tls
        configuration:
          useServiceDnsDomain: true
      # External access via Load Balancer
      - name: external
        port: 9094
        type: loadbalancer
        tls: true
        authentication:
          type: tls

    authorization:
      type: simple

    config:
      # Replication factor for internal topics
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      # Log retention
      log.retention.hours: 168  # 7 days
      log.retention.bytes: 10737418240  # 10GB per partition
      # Compression
      compression.type: snappy
      # Network tuning
      num.network.threads: 5
      num.io.threads: 8
      socket.send.buffer.bytes: 102400
      socket.receive.buffer.bytes: 102400

    metricsConfig:
      type: jmxPrometheusExporter
      valueFrom:
        configMapKeyRef:
          name: kafka-metrics
          key: kafka-metrics-config.yml

  entityOperator:
    topicOperator:
      resources:
        requests:
          memory: 256Mi
          cpu: 100m
    userOperator:
      resources:
        requests:
          memory: 256Mi
          cpu: 100m

  kafkaExporter:
    topicRegex: ".*"
    groupRegex: ".*"
```

## Step 3: Create Kafka Topics

```yaml
# kafka-topics.yaml - Declarative topic management
apiVersion: kafka.strimzi.io/v1
kind: KafkaTopic
metadata:
  name: orders-topic
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-prod
spec:
  partitions: 12      # Number of partitions for parallelism
  replicas: 3         # Replication factor
  config:
    retention.ms: 604800000     # 7 days
    segment.bytes: 1073741824   # 1GB segments
    compression.type: snappy
    cleanup.policy: delete
    min.insync.replicas: "2"    # Ensure at least 2 replicas in sync
---
apiVersion: kafka.strimzi.io/v1
kind: KafkaTopic
metadata:
  name: orders-dlq
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-prod
spec:
  partitions: 3
  replicas: 3
  config:
    retention.ms: 2592000000  # 30 days for DLQ
    cleanup.policy: compact   # Keep latest message per key
```

## Step 4: Create Kafka Users with ACLs

```yaml
# kafka-user.yaml - Kafka users with specific ACLs
apiVersion: kafka.strimzi.io/v1
kind: KafkaUser
metadata:
  name: order-producer
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-prod
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      # Allow writing to orders topic
      - resource:
          type: topic
          name: orders-topic
          patternType: literal
        operations:
          - Write
          - Describe
        host: "*"
---
apiVersion: kafka.strimzi.io/v1
kind: KafkaUser
metadata:
  name: kafka-connect
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-prod
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      # Access to Kafka Connect internal topics
      - resource:
          type: topic
          name: connect-cluster-offsets
          patternType: literal
        operations:
          - Create
          - Describe
          - Read
          - Write
        host: "*"
      - resource:
          type: topic
          name: connect-cluster-status
          patternType: literal
        operations:
          - Create
          - Describe
          - Read
          - Write
        host: "*"
      - resource:
          type: topic
          name: connect-cluster-configs
          patternType: literal
        operations:
          - Create
          - Describe
          - Read
          - Write
        host: "*"
      - resource:
          type: group
          name: connect-cluster
          patternType: literal
        operations:
          - Read
        host: "*"
```

## Step 5: Connect Applications to Kafka

```yaml
# app-deployment.yaml - Example application using Kafka with Strimzi-generated PKCS #12 stores
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: kafka
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: registry.example.com/order-service:v1.0
          env:
            - name: KAFKA_BOOTSTRAP_SERVERS
              value: "kafka-prod-kafka-bootstrap:9093"
            - name: KAFKA_TOPIC
              value: "orders-topic"
            # TLS configuration
            - name: KAFKA_SECURITY_PROTOCOL
              value: "SSL"
            - name: KAFKA_SSL_TRUSTSTORE_LOCATION
              value: "/opt/kafka/cluster-ca/ca.p12"
            - name: KAFKA_SSL_TRUSTSTORE_TYPE
              value: "PKCS12"
            - name: KAFKA_SSL_TRUSTSTORE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: kafka-prod-cluster-ca-cert
                  key: ca.password
            - name: KAFKA_SSL_KEYSTORE_LOCATION
              value: "/opt/kafka/user/user.p12"
            - name: KAFKA_SSL_KEYSTORE_TYPE
              value: "PKCS12"
            - name: KAFKA_SSL_KEYSTORE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: order-producer
                  key: user.password
          volumeMounts:
            - name: kafka-cluster-ca
              mountPath: /opt/kafka/cluster-ca
              readOnly: true
            - name: kafka-user
              mountPath: /opt/kafka/user
              readOnly: true
      volumes:
        - name: kafka-cluster-ca
          secret:
            secretName: kafka-prod-cluster-ca-cert
        - name: kafka-user
          secret:
            secretName: order-producer  # KafkaUser secret
```

## Step 6: Deploy Kafka Connect

```yaml
# kafka-connect.yaml - Kafka Connect for data integration
apiVersion: kafka.strimzi.io/v1
kind: KafkaConnect
metadata:
  name: kafka-connect
  namespace: kafka
  annotations:
    strimzi.io/use-connector-resources: "true"
spec:
  version: 4.2.0
  replicas: 2
  bootstrapServers: kafka-prod-kafka-bootstrap:9093
  groupId: connect-cluster
  configStorageTopic: connect-cluster-configs
  offsetStorageTopic: connect-cluster-offsets
  statusStorageTopic: connect-cluster-status
  tls:
    trustedCertificates:
      - secretName: kafka-prod-cluster-ca-cert
        pattern: "*.crt"
  authentication:
    type: tls
    certificateAndKey:
      secretName: kafka-connect
      certificate: user.crt
      key: user.key
  config:
    config.storage.replication.factor: 3
    offset.storage.replication.factor: 3
    status.storage.replication.factor: 3
```

## Step 7: Monitor Kafka Cluster

```yaml
# kafka-metrics-configmap.yaml - JMX Prometheus metrics config
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-metrics
  namespace: kafka
data:
  kafka-metrics-config.yml: |
    lowercaseOutputName: true
    rules:
      - pattern: "kafka.server<type=(.+), name=(.+), clientId=(.+), topic=(.+), partition=(.*)><>Value"
        name: kafka_server_$1_$2
        type: GAUGE
      - pattern: "kafka.network<type=(.+), name=(.+)><>Count"
        name: kafka_network_$1_$2_count
        type: COUNTER
```

## Troubleshooting

```bash
# Check cluster status
kubectl get kafka kafka-prod -n kafka

# List Strimzi-managed topics
kubectl get kafkatopic -n kafka

# Check Kafka Connect status
kubectl get kafkaconnect kafka-connect -n kafka

# Check logs
kubectl logs -n kafka kafka-prod-brokers-0 --tail=100
```

## Conclusion

Apache Kafka on Rancher with the Strimzi operator provides a production-grade event streaming platform with Kubernetes-native management. Strimzi handles complex operational tasks like rolling upgrades, TLS certificate management, and user authorization. For production deployments, use TLS authentication, configure appropriate replication factors, and monitor consumer lag to detect processing bottlenecks.
