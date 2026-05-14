# How to Deploy Apache Kafka with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Apache Kafka, Message Queue, Streaming, GitOps, Kubernetes, Event Streaming

Description: A practical guide to deploying Apache Kafka on Kubernetes using Flux CD for GitOps-managed event streaming and message queuing.

---

## Introduction

Apache Kafka is a distributed event streaming platform used for building real-time data pipelines and streaming applications. It handles high-throughput, fault-tolerant messaging with features like topic partitioning, consumer groups, and exactly-once semantics. Deploying Kafka with Flux CD enables you to manage your messaging infrastructure through GitOps, ensuring consistent deployments and trackable configuration changes.

This guide covers deploying Apache Kafka on Kubernetes using the Bitnami Helm chart through Flux CD, including KRaft controller setup, topic configuration, and production-ready settings.

## Prerequisites

- A Kubernetes cluster (v1.26 or later) with at least 12 GB of available memory
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- Persistent storage available (at least 200 GB recommended for the example PVC sizes)

## Repository Structure

```text
clusters/
  my-cluster/
    kafka/
      namespace.yaml
      helmrepository.yaml
      helmrelease.yaml
      topics.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/kafka/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: kafka
  labels:
    toolkit.fluxcd.io/tenant: messaging
```

## Step 2: Add the Helm Repository

```yaml
# clusters/my-cluster/kafka/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: kafka
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
```

## Step 3: Create the HelmRelease

Deploy Kafka with KRaft mode (no ZooKeeper dependency) for a simplified architecture.

```yaml
# clusters/my-cluster/kafka/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kafka
  namespace: kafka
spec:
  interval: 30m
  chart:
    spec:
      chart: kafka
      version: "30.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
      interval: 12h
  # Kafka deployment can take time due to rolling updates
  timeout: 15m
  values:
    # Use KRaft mode (ZooKeeper-less) for simplified operation
    kraft:
      enabled: true
      # Cluster ID (generate once and keep consistent)
      clusterId: "my-kafka-cluster-id-001"

    # Controller configuration (replaces ZooKeeper)
    controller:
      # Number of controller replicas (must be odd for quorum)
      replicaCount: 3
      # Run controllers separately from brokers
      controllerOnly: true
      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: "1"
          memory: 1Gi
      persistence:
        enabled: true
        size: 10Gi
        storageClass: standard
      # Pod disruption budget for controller quorum availability
      pdb:
        create: true
        minAvailable: 2
      # Anti-affinity to spread controllers across nodes
      podAntiAffinityPreset: hard

    # Broker configuration
    broker:
      # Number of Kafka broker replicas
      replicaCount: 3
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: "2"
          memory: 2Gi
      # Persistent storage for message data
      persistence:
        enabled: true
        size: 50Gi
        storageClass: standard
      # Pod disruption budget for broker availability
      pdb:
        create: true
        minAvailable: 2
      # Anti-affinity to spread brokers across nodes
      podAntiAffinityPreset: hard

    # Kafka broker configuration settings
    extraConfig: |
      # Default replication factor for new topics
      default.replication.factor=3
      # Minimum in-sync replicas for acknowledged writes
      min.insync.replicas=2
      # Number of partitions for auto-created topics
      num.partitions=6
      # Log retention settings
      log.retention.hours=168
      log.retention.bytes=10737418240
      # Segment size for log files
      log.segment.bytes=1073741824
      # Enable auto topic creation (disable in production if desired)
      auto.create.topics.enable=false
      # Message size limits
      message.max.bytes=10485760
      replica.fetch.max.bytes=10485760
      # Compression type for produced messages
      compression.type=lz4

    # Authentication settings
    sasl:
      enabledMechanisms: PLAIN,SCRAM-SHA-256,SCRAM-SHA-512
      # Inter-broker authentication
      interBrokerMechanism: PLAIN
      # Client authentication
      client:
        users:
          - admin
          - producer
          - consumer
        passwords: ""  # Will use auto-generated passwords stored in a Secret

    # Listeners configuration
    listeners:
      client:
        protocol: SASL_PLAINTEXT
      controller:
        protocol: SASL_PLAINTEXT
      interbroker:
        protocol: SASL_PLAINTEXT

    # JMX metrics for monitoring
    metrics:
      # JMX exporter for Prometheus
      jmx:
        enabled: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
      # ServiceMonitor for Prometheus Operator
      serviceMonitor:
        enabled: true
        labels:
          release: prometheus
```

## Step 4: Create Kafka Topics

Define Kafka topics as Kubernetes resources using a Job that runs after Kafka is deployed.

```yaml
# clusters/my-cluster/kafka/topics.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: kafka-create-topics
  namespace: kafka
  annotations:
    # Ensure this runs after the Kafka HelmRelease is ready
    kustomize.toolkit.fluxcd.io/ssa: merge
spec:
  backoffLimit: 5
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: create-topics
          image: bitnami/kafka:latest
          env:
            - name: KAFKA_CLIENT_PASSWORDS
              valueFrom:
                secretKeyRef:
                  name: kafka-user-passwords
                  key: client-passwords
          command:
            - /bin/bash
            - -c
            - |
              PASSWORD="$(echo "$KAFKA_CLIENT_PASSWORDS" | cut -d , -f 1)"
              cat > /tmp/client.properties <<EOF
              security.protocol=SASL_PLAINTEXT
              sasl.mechanism=PLAIN
              sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username="admin" password="$PASSWORD";
              EOF

              # Wait for Kafka to be ready
              echo "Waiting for Kafka to be ready..."
              until kafka-broker-api-versions.sh --bootstrap-server kafka.kafka.svc:9092 --command-config /tmp/client.properties 2>/dev/null; do
                echo "Kafka not ready yet, retrying in 10s..."
                sleep 10
              done

              echo "Creating topics..."

              # Create events topic with 12 partitions for high throughput
              kafka-topics.sh --bootstrap-server kafka.kafka.svc:9092 \
                --command-config /tmp/client.properties \
                --create --if-not-exists \
                --topic events \
                --partitions 12 \
                --replication-factor 3 \
                --config retention.ms=604800000 \
                --config cleanup.policy=delete

              # Create orders topic with compaction for state tracking
              kafka-topics.sh --bootstrap-server kafka.kafka.svc:9092 \
                --command-config /tmp/client.properties \
                --create --if-not-exists \
                --topic orders \
                --partitions 6 \
                --replication-factor 3 \
                --config cleanup.policy=compact \
                --config min.compaction.lag.ms=3600000

              # Create logs topic for log aggregation
              kafka-topics.sh --bootstrap-server kafka.kafka.svc:9092 \
                --command-config /tmp/client.properties \
                --create --if-not-exists \
                --topic application-logs \
                --partitions 6 \
                --replication-factor 3 \
                --config retention.ms=259200000 \
                --config cleanup.policy=delete

              # Create dead-letter topic for failed messages
              kafka-topics.sh --bootstrap-server kafka.kafka.svc:9092 \
                --command-config /tmp/client.properties \
                --create --if-not-exists \
                --topic dead-letter \
                --partitions 3 \
                --replication-factor 3 \
                --config retention.ms=-1

              echo "All topics created successfully."

              # List all topics for verification
              kafka-topics.sh --bootstrap-server kafka.kafka.svc:9092 --command-config /tmp/client.properties --list
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/kafka/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
  - topics.yaml
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/kafka-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kafka
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: kafka
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/kafka
  prune: true
  wait: true
  timeout: 15m
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: kafka
      namespace: kafka
```

## Step 7: Deploy a Test Producer

Verify the Kafka deployment with a simple producer.

```yaml
# clusters/my-cluster/kafka/test-producer.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kafka-test-producer
  namespace: kafka
spec:
  restartPolicy: Never
  containers:
    - name: producer
      image: bitnami/kafka:latest
      env:
        - name: KAFKA_CLIENT_PASSWORDS
          valueFrom:
            secretKeyRef:
              name: kafka-user-passwords
              key: client-passwords
      command:
        - /bin/bash
        - -c
        - |
          PASSWORD="$(echo "$KAFKA_CLIENT_PASSWORDS" | cut -d , -f 2)"
          cat > /tmp/client.properties <<EOF
          security.protocol=SASL_PLAINTEXT
          sasl.mechanism=PLAIN
          sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username="producer" password="$PASSWORD";
          EOF

          # Produce test messages to the events topic
          for i in $(seq 1 10); do
            echo "{\"event_id\": $i, \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"data\": \"test-event-$i\"}" | \
              kafka-console-producer.sh \
                --producer.config /tmp/client.properties \
                --bootstrap-server kafka.kafka.svc:9092 \
                --topic events
            echo "Produced message $i"
          done
          echo "All test messages produced."
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations kafka

# Check HelmRelease status
flux get helmreleases -n kafka

# Verify all Kafka pods are running
kubectl get pods -n kafka

# Check broker cluster status
kubectl exec -n kafka kafka-broker-0 -- bash -ec 'PASSWORD="$(echo "$KAFKA_CLIENT_PASSWORDS" | cut -d , -f 1)"; cat > /tmp/client.properties <<EOF
security.protocol=SASL_PLAINTEXT
sasl.mechanism=PLAIN
sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username="admin" password="$PASSWORD";
EOF'

# Check KRaft metadata quorum status
kubectl exec -n kafka kafka-broker-0 -- kafka-metadata-quorum.sh --bootstrap-server localhost:9092 --command-config /tmp/client.properties describe --status

# List topics
kubectl exec -n kafka kafka-broker-0 -- kafka-topics.sh --bootstrap-server localhost:9092 --command-config /tmp/client.properties --list

# Describe a specific topic
kubectl exec -n kafka kafka-broker-0 -- kafka-topics.sh --bootstrap-server localhost:9092 --command-config /tmp/client.properties --describe --topic events

# Check consumer group lag
kubectl exec -n kafka kafka-broker-0 -- kafka-consumer-groups.sh --bootstrap-server localhost:9092 --command-config /tmp/client.properties --all-groups --describe
```

## Troubleshooting

- **Brokers not forming a cluster**: Check that the KRaft cluster ID is consistent across all nodes. Verify network connectivity between broker pods.
- **Under-replicated partitions**: Check if all brokers are online. Use `kafka-topics.sh --describe` to identify partitions with insufficient replicas.
- **Producer timeouts**: Verify `min.insync.replicas` does not exceed the number of available brokers. Check broker resource limits.
- **Consumer lag growing**: Scale consumer group instances or increase partition count for the affected topic. Check consumer logs for processing errors.
- **Disk space running low**: Adjust `log.retention.hours` or `log.retention.bytes` to reduce data retention. Consider adding more storage.

## Conclusion

You have deployed Apache Kafka on Kubernetes using Flux CD with KRaft mode, eliminating the need for ZooKeeper. This setup provides a production-ready message streaming platform with replication, authentication, and monitoring. All configuration is managed through Git, allowing you to track changes to broker settings, topic configurations, and scaling decisions through pull requests. You can extend this setup by adding Schema Registry, Kafka Connect, or configuring cross-cluster replication for disaster recovery.
