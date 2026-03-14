# How to Deploy Strimzi Kafka Operator with Custom Resources via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kafka, Strimzi, Message Queue, Streaming

Description: Deploy the Strimzi Kafka Operator and Kafka clusters on Kubernetes using Flux CD for GitOps-managed event streaming infrastructure.

---

## Introduction

Strimzi is the leading open-source Kubernetes operator for Apache Kafka. It manages Kafka brokers, ZooKeeper (or KRaft for newer versions), Kafka Connect, MirrorMaker 2, and the Kafka Bridge through Kubernetes Custom Resources. Strimzi handles TLS certificate generation, user authentication, rolling upgrades, and topic management declaratively.

Deploying Strimzi through Flux CD gives you GitOps control over your entire Kafka infrastructure — from broker configuration and topic definitions to user ACLs and connector deployments. Every change to your event streaming platform flows through a Git pull request, making your messaging infrastructure as auditable as your application code.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs (SSDs recommended for Kafka)
- Minimum 3 nodes for a production Kafka cluster
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Strimzi HelmRepository

```yaml
# infrastructure/sources/strimzi-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: strimzi
  namespace: flux-system
spec:
  interval: 12h
  url: https://strimzi.io/charts
```

## Step 2: Deploy the Strimzi Operator

```yaml
# infrastructure/messaging/strimzi/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kafka
  labels:
    app.kubernetes.io/managed-by: flux
```

```yaml
# infrastructure/messaging/strimzi/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: strimzi-kafka-operator
  namespace: kafka
spec:
  interval: 30m
  chart:
    spec:
      chart: strimzi-kafka-operator
      version: "0.42.0"
      sourceRef:
        kind: HelmRepository
        name: strimzi
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    replicas: 1
    resources:
      requests:
        cpu: "200m"
        memory: "384Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    # Watch all namespaces (or restrict to 'kafka')
    watchNamespaces: []
```

## Step 3: Deploy a Kafka Cluster

```yaml
# infrastructure/messaging/strimzi/kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: production
  namespace: kafka
spec:
  kafka:
    version: 3.7.1
    replicas: 3
    listeners:
      # Internal plaintext listener
      - name: plain
        port: 9092
        type: internal
        tls: false
      # Internal TLS listener
      - name: tls
        port: 9093
        type: internal
        tls: true
        authentication:
          type: tls
      # External access via LoadBalancer
      - name: external
        port: 9094
        type: loadbalancer
        tls: true
        authentication:
          type: tls

    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      log.retention.hours: 168       # 7 days
      log.retention.bytes: 10737418240  # 10 GiB per partition
      log.segment.bytes: 1073741824     # 1 GiB per segment
      num.partitions: 3
      num.recovery.threads.per.data.dir: 1
      auto.create.topics.enable: "false"  # always create topics explicitly

    resources:
      requests:
        memory: 2Gi
        cpu: "500m"
      limits:
        memory: 4Gi
        cpu: "2"

    jvmOptions:
      -Xms: 1024m
      -Xmx: 2048m

    storage:
      type: persistent-claim
      size: 100Gi
      class: premium-ssd
      deleteClaim: false

    metricsConfig:
      type: jmxPrometheusExporter
      valueFrom:
        configMapKeyRef:
          name: kafka-metrics-config
          key: kafka-metrics-config.yml

    template:
      pod:
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - topologyKey: kubernetes.io/hostname
                labelSelector:
                  matchLabels:
                    strimzi.io/cluster: production
                    strimzi.io/kind: Kafka

  # Use KRaft mode (no ZooKeeper) for Kafka 3.7+
  zookeeper:
    replicas: 3
    resources:
      requests:
        memory: 1Gi
        cpu: "250m"
      limits:
        memory: 2Gi
        cpu: "500m"
    storage:
      type: persistent-claim
      size: 10Gi
      deleteClaim: false

  entityOperator:
    topicOperator:
      resources:
        requests:
          memory: 256Mi
          cpu: "100m"
        limits:
          memory: 512Mi
          cpu: "500m"
    userOperator:
      resources:
        requests:
          memory: 256Mi
          cpu: "100m"
        limits:
          memory: 512Mi
          cpu: "500m"
```

## Step 4: Create Kafka Metrics ConfigMap

```yaml
# infrastructure/messaging/strimzi/kafka-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-metrics-config
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
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/kafka-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: strimzi-kafka
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/strimzi
  prune: true
  dependsOn:
    - name: strimzi-operator
  healthChecks:
    - apiVersion: kafka.strimzi.io/v1beta2
      kind: Kafka
      name: production
      namespace: kafka
  timeout: 10m
```

## Step 6: Verify the Cluster

```bash
# Check cluster status
kubectl get kafka production -n kafka

# Check all pods
kubectl get pods -n kafka

# Check broker logs
kubectl logs -n kafka production-kafka-0 --tail=30

# Produce a test message
kubectl exec -n kafka production-kafka-0 -- \
  kafka-console-producer.sh \
  --bootstrap-server production-kafka-bootstrap:9092 \
  --topic my-test-topic <<< "test message from flux post"

# Consume messages
kubectl exec -n kafka production-kafka-0 -- \
  kafka-console-consumer.sh \
  --bootstrap-server production-kafka-bootstrap:9092 \
  --topic my-test-topic \
  --from-beginning \
  --max-messages 1
```

## Best Practices

- Set `auto.create.topics.enable: "false"` to enforce explicit topic creation through `KafkaTopic` CRDs.
- Set `min.insync.replicas: 2` and `acks=all` in producers for guaranteed durability against broker loss.
- Use pod anti-affinity rules to ensure Kafka brokers are on different Kubernetes nodes.
- Enable JMX Prometheus metrics and import the Strimzi Grafana dashboard for broker monitoring.
- Pin Kafka version in the `Kafka` CRD — upgrades are rolling but should be tested in staging first.

## Conclusion

The Strimzi Kafka Operator deployed via Flux CD gives you a production-grade Kafka cluster managed entirely through Kubernetes CRDs. Topic definitions, user ACLs, and broker configuration are all GitOps-managed, eliminating manual Kafka administration. With Flux's health checks ensuring the cluster is ready before dependent applications start, your entire event streaming infrastructure is as reliable and reproducible as your application deployments.
