# How to Use HelmRelease for Deploying Kafka with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Kafka, Messaging, Event Streaming, Bitnami

Description: Learn how to deploy Apache Kafka on Kubernetes using a Flux HelmRelease with the Bitnami Helm chart for distributed event streaming.

---

Apache Kafka is a distributed event streaming platform used for high-throughput, real-time data pipelines and event-driven architectures. Deploying Kafka on Kubernetes through Flux CD ensures your messaging infrastructure is version-controlled and reproducible. This guide uses the Bitnami Kafka Helm chart, which includes KRaft mode support (eliminating the need for ZooKeeper).

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- Persistent volume provisioner available in your cluster
- Sufficient resources (Kafka brokers require at least 1 GB memory each)

## Creating the HelmRepository

Bitnami charts are distributed as OCI artifacts.

```yaml
# helmrepository-bitnami.yaml - Bitnami OCI Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  type: oci
  url: oci://registry-1.docker.io/bitnamicharts
```

## Deploying Kafka with HelmRelease

The following HelmRelease deploys Kafka using KRaft mode (no ZooKeeper dependency) with persistent storage and metrics enabled.

```yaml
# helmrelease-kafka.yaml - Apache Kafka deployment via Flux using Bitnami chart
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kafka
  namespace: kafka
spec:
  interval: 15m
  chart:
    spec:
      chart: kafka
      version: "31.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 15m
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 15m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # Kafka listeners configuration
    listeners:
      client:
        protocol: PLAINTEXT
      controller:
        protocol: PLAINTEXT
      interbroker:
        protocol: PLAINTEXT

    # Controller configuration (KRaft mode - no ZooKeeper)
    controller:
      # Number of controller+broker combined nodes
      replicaCount: 3

      # Resource requests and limits
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 2Gi

      # Persistent storage for Kafka data
      persistence:
        enabled: true
        size: 50Gi
        accessModes:
          - ReadWriteOnce

      # Pod disruption budget
      pdb:
        create: true
        minAvailable: 2

    # Broker configuration (set to 0 when using combined controller+broker nodes)
    broker:
      replicaCount: 0

    # Kafka configuration overrides
    extraConfig: |
      # Default number of partitions for auto-created topics
      num.partitions=3
      # Default replication factor
      default.replication.factor=3
      # Minimum in-sync replicas for producer acknowledgment
      min.insync.replicas=2
      # Log retention hours
      log.retention.hours=168
      # Log segment size
      log.segment.bytes=1073741824
      # Enable auto topic creation
      auto.create.topics.enable=false
      # Message max bytes
      message.max.bytes=10485760

    # Service configuration
    service:
      type: ClusterIP
      ports:
        client: 9092

    # External access configuration (for clients outside the cluster)
    externalAccess:
      enabled: false

    # Prometheus metrics via JMX exporter
    metrics:
      kafka:
        enabled: true
        resources:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      serviceMonitor:
        enabled: true
        namespace: kafka

    # SASL authentication (enable for production)
    sasl:
      client:
        users:
          - admin
        passwords: "changeme-use-secret"

    # Provisioning: create topics on startup
    provisioning:
      enabled: true
      topics:
        - name: events
          partitions: 6
          replicationFactor: 3
          config:
            retention.ms: "604800000"
            cleanup.policy: "delete"
        - name: logs
          partitions: 3
          replicationFactor: 3
          config:
            retention.ms: "259200000"
            cleanup.policy: "delete"
```

## Connecting Producers and Consumers

Applications within the cluster can connect to Kafka using the internal service DNS.

```bash
# Kafka broker endpoint (internal to the cluster)
kafka.kafka.svc.cluster.local:9092

# For headless service access to individual brokers
kafka-controller-0.kafka-controller-headless.kafka.svc.cluster.local:9092
kafka-controller-1.kafka-controller-headless.kafka.svc.cluster.local:9092
kafka-controller-2.kafka-controller-headless.kafka.svc.cluster.local:9092
```

Example producer configuration for an application:

```yaml
# Snippet: Application environment variables for Kafka connection
env:
  - name: KAFKA_BOOTSTRAP_SERVERS
    value: "kafka.kafka.svc.cluster.local:9092"
  - name: KAFKA_TOPIC
    value: "events"
```

## Testing Kafka with CLI Tools

Verify Kafka is working by producing and consuming test messages.

```bash
# Check HelmRelease status
flux get helmrelease kafka -n kafka

# Verify all Kafka pods are running
kubectl get pods -n kafka

# Run a test producer
kubectl run kafka-producer --rm -it --image=bitnami/kafka:latest --namespace=kafka -- \
  kafka-console-producer.sh --bootstrap-server kafka.kafka.svc.cluster.local:9092 --topic events

# In another terminal, run a test consumer
kubectl run kafka-consumer --rm -it --image=bitnami/kafka:latest --namespace=kafka -- \
  kafka-console-consumer.sh --bootstrap-server kafka.kafka.svc.cluster.local:9092 --topic events --from-beginning

# List all topics
kubectl run kafka-topics --rm -it --image=bitnami/kafka:latest --namespace=kafka -- \
  kafka-topics.sh --bootstrap-server kafka.kafka.svc.cluster.local:9092 --list

# Describe a topic
kubectl run kafka-describe --rm -it --image=bitnami/kafka:latest --namespace=kafka -- \
  kafka-topics.sh --bootstrap-server kafka.kafka.svc.cluster.local:9092 --describe --topic events
```

## Deploying Kafka UI

For a web-based management interface, deploy Kafka UI alongside your cluster.

```yaml
# kafka-ui.yaml - Simple Kafka UI deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-ui
  namespace: kafka
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka-ui
  template:
    metadata:
      labels:
        app: kafka-ui
    spec:
      containers:
        - name: kafka-ui
          image: provectuslabs/kafka-ui:latest
          ports:
            - containerPort: 8080
          env:
            - name: KAFKA_CLUSTERS_0_NAME
              value: "production"
            - name: KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS
              value: "kafka.kafka.svc.cluster.local:9092"
```

## Summary

Deploying Apache Kafka through a Flux HelmRelease using the Bitnami chart from `oci://registry-1.docker.io/bitnamicharts` provides a GitOps-managed event streaming platform. The chart supports KRaft mode (eliminating ZooKeeper), automatic topic provisioning, SASL authentication, persistent storage, and Prometheus metrics. This setup gives you a production-ready Kafka cluster that is fully declarative and reproducible across environments.
