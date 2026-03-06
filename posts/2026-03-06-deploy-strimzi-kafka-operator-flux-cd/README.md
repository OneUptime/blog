# How to Deploy Strimzi Kafka Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, strimzi, kafka, operator, message queue, streaming, gitops, kubernetes

Description: A comprehensive guide to deploying the Strimzi Kafka Operator on Kubernetes using Flux CD for Kubernetes-native Kafka cluster management.

---

## Introduction

Strimzi is a Kubernetes Operator that simplifies running Apache Kafka on Kubernetes. It provides custom resources for managing Kafka clusters, topics, users, and connectors through the Kubernetes API. Unlike deploying Kafka directly with Helm charts, Strimzi offers a Kubernetes-native approach where Kafka clusters are managed as custom resources, enabling declarative management and automated operations. Deploying Strimzi with Flux CD combines the operator pattern with GitOps for a fully automated Kafka lifecycle.

This guide covers deploying the Strimzi Operator using Flux CD, creating a Kafka cluster, managing topics and users declaratively, and configuring Kafka Connect.

## Prerequisites

- A Kubernetes cluster (v1.26 or later) with at least 16 GB of available memory
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- Persistent storage available

## Repository Structure

```
clusters/
  my-cluster/
    strimzi/
      namespace.yaml
      helmrepository.yaml
      operator.yaml
      kafka-cluster.yaml
      topics.yaml
      users.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/strimzi/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: strimzi
  labels:
    toolkit.fluxcd.io/tenant: messaging
```

## Step 2: Add the Helm Repository

```yaml
# clusters/my-cluster/strimzi/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: strimzi
  namespace: strimzi
spec:
  interval: 1h
  url: https://strimzi.io/charts/
```

## Step 3: Deploy the Strimzi Operator

Install the Strimzi Operator, which will watch for Kafka custom resources and manage cluster lifecycle.

```yaml
# clusters/my-cluster/strimzi/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: strimzi-operator
  namespace: strimzi
spec:
  interval: 30m
  chart:
    spec:
      chart: strimzi-kafka-operator
      version: "0.43.x"
      sourceRef:
        kind: HelmRepository
        name: strimzi
      interval: 12h
  timeout: 10m
  values:
    # Watch all namespaces for Kafka resources
    watchAnyNamespace: true

    # Operator resource allocation
    resources:
      requests:
        cpu: 200m
        memory: 384Mi
      limits:
        cpu: 500m
        memory: 512Mi

    # Log level for the operator
    logLevel: INFO

    # Feature gates for additional functionality
    featureGates: "+UseKRaft,+KafkaNodePools"

    # Dashboard integration
    dashboards:
      enabled: true
      labels:
        grafana_dashboard: "true"
```

## Step 4: Create the Kafka Cluster

Define a Kafka cluster using Strimzi custom resources with KRaft mode.

```yaml
# clusters/my-cluster/strimzi/kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: controllers
  namespace: strimzi
  labels:
    strimzi.io/cluster: my-kafka-cluster
spec:
  replicas: 3
  # Controller-only nodes (KRaft mode)
  roles:
    - controller
  storage:
    type: persistent-claim
    size: 10Gi
    class: standard
    deleteClaim: false
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: "1"
      memory: 1Gi
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaNodePool
metadata:
  name: brokers
  namespace: strimzi
  labels:
    strimzi.io/cluster: my-kafka-cluster
spec:
  replicas: 3
  # Broker-only nodes for handling client traffic
  roles:
    - broker
  storage:
    type: persistent-claim
    size: 100Gi
    class: standard
    deleteClaim: false
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: "2"
      memory: 2Gi
  template:
    pod:
      # Spread brokers across different nodes
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  strimzi.io/name: my-kafka-cluster-brokers
              topologyKey: kubernetes.io/hostname
---
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: my-kafka-cluster
  namespace: strimzi
  annotations:
    strimzi.io/node-pools: enabled
    strimzi.io/kraft: enabled
spec:
  kafka:
    version: 3.7.0
    # Listeners define how clients connect to Kafka
    listeners:
      # Internal listener for in-cluster access
      - name: plain
        port: 9092
        type: internal
        tls: false
      # TLS listener for encrypted in-cluster access
      - name: tls
        port: 9093
        type: internal
        tls: true
      # External listener for access from outside the cluster
      - name: external
        port: 9094
        type: nodeport
        tls: true
        authentication:
          type: scram-sha-512
    # Kafka broker configuration
    config:
      # Replication settings
      default.replication.factor: 3
      min.insync.replicas: 2
      # Partition settings
      num.partitions: 6
      # Log retention
      log.retention.hours: 168
      log.retention.bytes: 10737418240
      log.segment.bytes: 1073741824
      # Transaction settings
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      # Offset topic settings
      offsets.topic.replication.factor: 3
    # Metrics configuration using JMX
    metricsConfig:
      type: jmxPrometheusExporter
      valueFrom:
        configMapKeyRef:
          name: kafka-metrics
          key: kafka-metrics-config.yml
  # Entity Operator manages topics and users
  entityOperator:
    topicOperator:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
    userOperator:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
  # Kafka Exporter for consumer lag metrics
  kafkaExporter:
    topicRegex: ".*"
    groupRegex: ".*"
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
---
# Metrics configuration for JMX exporter
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-metrics
  namespace: strimzi
data:
  kafka-metrics-config.yml: |
    lowercaseOutputName: true
    rules:
      # Broker metrics
      - pattern: kafka.server<type=(.+), name=(.+), clientId=(.+), topic=(.+), partition=(.*)><>Value
        name: kafka_server_$1_$2
        type: GAUGE
        labels:
          clientId: "$3"
          topic: "$4"
          partition: "$5"
      - pattern: kafka.server<type=(.+), name=(.+)><>Value
        name: kafka_server_$1_$2
        type: GAUGE
      # Controller metrics
      - pattern: kafka.controller<type=(.+), name=(.+)><>Value
        name: kafka_controller_$1_$2
        type: GAUGE
```

## Step 5: Create Kafka Topics

Define topics declaratively using Strimzi KafkaTopic resources.

```yaml
# clusters/my-cluster/strimzi/topics.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: events
  namespace: strimzi
  labels:
    # Link this topic to the Kafka cluster
    strimzi.io/cluster: my-kafka-cluster
spec:
  partitions: 12
  replicas: 3
  config:
    # Retain messages for 7 days
    retention.ms: "604800000"
    # Delete old segments
    cleanup.policy: delete
    # Compression on the broker side
    compression.type: lz4
    # Maximum message size
    max.message.bytes: "10485760"
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: orders
  namespace: strimzi
  labels:
    strimzi.io/cluster: my-kafka-cluster
spec:
  partitions: 6
  replicas: 3
  config:
    # Use log compaction to keep latest value per key
    cleanup.policy: compact
    # Minimum time before a message can be compacted
    min.compaction.lag.ms: "3600000"
    # Delete tombstone records after 24 hours
    delete.retention.ms: "86400000"
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: dead-letter
  namespace: strimzi
  labels:
    strimzi.io/cluster: my-kafka-cluster
spec:
  partitions: 3
  replicas: 3
  config:
    # Keep dead letter messages indefinitely
    retention.ms: "-1"
    cleanup.policy: delete
```

## Step 6: Create Kafka Users

Define Kafka users with specific ACL permissions.

```yaml
# clusters/my-cluster/strimzi/users.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: producer-app
  namespace: strimzi
  labels:
    strimzi.io/cluster: my-kafka-cluster
spec:
  authentication:
    type: scram-sha-512
  authorization:
    type: simple
    acls:
      # Allow producing to events and orders topics
      - resource:
          type: topic
          name: events
          patternType: literal
        operations:
          - Write
          - Describe
      - resource:
          type: topic
          name: orders
          patternType: literal
        operations:
          - Write
          - Describe
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: consumer-app
  namespace: strimzi
  labels:
    strimzi.io/cluster: my-kafka-cluster
spec:
  authentication:
    type: scram-sha-512
  authorization:
    type: simple
    acls:
      # Allow consuming from events and orders topics
      - resource:
          type: topic
          name: events
          patternType: literal
        operations:
          - Read
          - Describe
      - resource:
          type: topic
          name: orders
          patternType: literal
        operations:
          - Read
          - Describe
      # Allow managing consumer group offsets
      - resource:
          type: group
          name: consumer-group-
          patternType: prefix
        operations:
          - Read
```

## Step 7: Create the Kustomization

```yaml
# clusters/my-cluster/strimzi/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - operator.yaml
  - kafka-cluster.yaml
  - topics.yaml
  - users.yaml
```

## Step 8: Create the Flux Kustomization

```yaml
# clusters/my-cluster/strimzi-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: strimzi
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: strimzi
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/strimzi
  prune: true
  wait: true
  timeout: 20m
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: strimzi-operator
      namespace: strimzi
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations strimzi

# Check the operator HelmRelease
flux get helmreleases -n strimzi

# Verify the operator is running
kubectl get pods -n strimzi -l name=strimzi-cluster-operator

# Check the Kafka cluster status
kubectl get kafka -n strimzi

# Check Kafka node pools
kubectl get kafkanodepool -n strimzi

# Verify all Kafka pods are ready
kubectl get pods -n strimzi -l strimzi.io/cluster=my-kafka-cluster

# Check topic status
kubectl get kafkatopic -n strimzi

# Check user status and their secrets
kubectl get kafkauser -n strimzi
kubectl get secret -n strimzi -l strimzi.io/kind=KafkaUser
```

## Troubleshooting

- **Operator not creating Kafka pods**: Check operator logs with `kubectl logs -n strimzi -l name=strimzi-cluster-operator`. Verify CRDs are installed correctly.
- **Kafka cluster stuck in NotReady**: Check individual pod logs. Common causes include insufficient resources, storage class issues, or network problems.
- **Topics not being created**: Verify the Entity Operator is running. Check that the topic resource has the correct `strimzi.io/cluster` label.
- **User authentication failing**: Verify the KafkaUser secret was created. Check that the authentication type matches the listener configuration.
- **Rolling update stuck**: Check pod disruption budgets and ensure sufficient cluster capacity for rolling updates.

## Conclusion

You have deployed the Strimzi Kafka Operator on Kubernetes using Flux CD. Strimzi provides a Kubernetes-native way to manage Kafka clusters, topics, users, and connectors as custom resources. Combined with Flux CD, this creates a fully GitOps-driven messaging platform where cluster changes, topic configurations, and user permissions are all managed through version-controlled manifests. You can extend this setup by adding Kafka Connect for data integration, Kafka MirrorMaker for cross-cluster replication, or Cruise Control for automated cluster rebalancing.
