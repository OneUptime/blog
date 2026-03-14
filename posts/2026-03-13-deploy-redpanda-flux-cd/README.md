# How to Deploy Redpanda with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Redpanda, Kafka, Streaming, Message Queue

Description: Deploy Redpanda Kafka-compatible streaming platform on Kubernetes using Flux CD HelmRelease for GitOps-managed high-performance event streaming.

---

## Introduction

Redpanda is a Kafka-compatible streaming data platform written in C++ using the Seastar framework. It delivers Kafka API compatibility without ZooKeeper, the JVM, or garbage collection pauses. A single Redpanda node handles the same throughput as a multi-node Kafka cluster, with end-to-end latencies in the single-digit milliseconds. Redpanda is API-compatible with Kafka producers and consumers, making migration straightforward.

Deploying Redpanda through Flux CD gives you a GitOps-managed Kafka-compatible event streaming platform that is significantly simpler to operate than Kafka. No ZooKeeper to manage, no JVM tuning, and a smaller resource footprint. The official Helm chart handles cluster formation through Redpanda's Raft-based consensus.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs (NVMe recommended)
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Redpanda HelmRepository

```yaml
# infrastructure/sources/redpanda-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: redpanda
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.redpanda.com
```

## Step 2: Create the Namespace

```yaml
# infrastructure/messaging/redpanda/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: redpanda
```

## Step 3: Deploy Redpanda

```yaml
# infrastructure/messaging/redpanda/redpanda-cluster.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redpanda
  namespace: redpanda
spec:
  interval: 30m
  chart:
    spec:
      chart: redpanda
      version: "5.9.4"
      sourceRef:
        kind: HelmRepository
        name: redpanda
        namespace: flux-system
  values:
    clusterDomain: cluster.local

    # 3-node Redpanda cluster
    statefulset:
      replicas: 3
      priorityClassName: ""
      podAffinity:
        type: soft    # prefer but don't require separate nodes

    resources:
      cpu:
        cores: 2
        overprovisioned: false  # dedicate CPU cores, don't share
      memory:
        container:
          max: "4Gi"
        redpanda:
          reserveMemory: "1Gi"  # reserve memory for OS

    storage:
      hostPath: ""
      persistentVolume:
        enabled: true
        labels: {}
        annotations: {}
        storageClass: premium-ssd
        size: 100Gi

    # Kafka API compatibility
    listeners:
      kafka:
        port: 9092
        external:
          default:
            enabled: false
        tls:
          enabled: false   # enable in production

      # Admin API for rpk tool
      admin:
        port: 9644

      # HTTP Pandaproxy (REST proxy)
      http:
        enabled: true
        port: 8082

      # Schema Registry
      schemaRegistry:
        enabled: true
        port: 8081

    config:
      cluster:
        # Raft replication settings
        default_replication_factor: 3
        raft_heartbeat_interval_ms: 100
        # Log retention
        log_retention_ms: 604800000    # 7 days
        log_segment_size: 1073741824   # 1 GiB
        # Topic settings
        auto_create_topics_enabled: false
        # Compaction
        log_compaction_interval_ms: 5000

    auth:
      sasl:
        enabled: true
        secretRef: redpanda-superuser-credentials
        users:
          - name: admin
            mechanism: SCRAM-SHA-512

    tls:
      enabled: false  # set to true in production

    # Monitor with Prometheus
    monitoring:
      enabled: true
```

## Step 4: Create Superuser Credentials

```yaml
# infrastructure/messaging/redpanda/superuser-secret.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: redpanda-superuser-credentials
  namespace: redpanda
type: Opaque
stringData:
  users.txt: |
    admin:AdminPassword123!:SCRAM-SHA-512
```

## Step 5: Create Topics via rpk Job

```yaml
# infrastructure/messaging/redpanda/topics-setup-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: redpanda-topics-setup
  namespace: redpanda
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: rpk
          image: redpandadata/redpanda:v24.2.1
          command:
            - /bin/sh
            - -c
            - |
              RPK_OPTS="--brokers redpanda-0.redpanda.redpanda.svc.cluster.local:9092 \
                --user admin \
                --password AdminPassword123! \
                --sasl-mechanism SCRAM-SHA-512"

              until rpk $RPK_OPTS cluster info; do
                echo "Waiting for Redpanda..."; sleep 5
              done

              # Create orders topic with 12 partitions
              rpk $RPK_OPTS topic create orders \
                --partitions 12 \
                --replicas 3 \
                --topic-config retention.ms=604800000 \
                --topic-config compression.type=snappy

              # Create user-events topic
              rpk $RPK_OPTS topic create user-events \
                --partitions 6 \
                --replicas 3 \
                --topic-config retention.ms=2592000000

              echo "Topics created successfully"
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/redpanda-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redpanda
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/redpanda
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: redpanda
      namespace: redpanda
```

## Step 7: Verify and Use

```bash
# Check Redpanda cluster
kubectl get pods -n redpanda

# Use rpk to check cluster health
kubectl exec -n redpanda redpanda-0 -- rpk cluster info

# List topics
kubectl exec -n redpanda redpanda-0 -- \
  rpk topic list \
  --brokers localhost:9092 \
  --user admin \
  --password AdminPassword123! \
  --sasl-mechanism SCRAM-SHA-512

# Produce a test message
kubectl exec -n redpanda redpanda-0 -- \
  rpk topic produce orders \
  --brokers localhost:9092 \
  --user admin \
  --password AdminPassword123! \
  --sasl-mechanism SCRAM-SHA-512 \
  <<< "test-key:test-value"

# Use Kafka producer from external tool (Kafka-compatible API)
# kafka-console-producer.sh --bootstrap-server redpanda.redpanda.svc:9092 \
#   --producer.config config.properties \
#   --topic orders
```

## Best Practices

- Set `resources.cpu.overprovisioned: false` to dedicate CPU cores to Redpanda — this is how it achieves consistent low latency.
- Use local NVMe storage (`hostPath` or local PVCs) for best write throughput — Redpanda's performance is I/O bound.
- Enable TLS and SASL authentication for all production deployments.
- Set `auto_create_topics_enabled: false` and create topics explicitly for production control.
- Use the Schema Registry endpoint (port 8081) for Avro and Protobuf message schema management.

## Conclusion

Redpanda deployed via Flux CD gives you a Kafka-compatible streaming platform that requires no ZooKeeper, no JVM, and delivers sub-millisecond latencies with a fraction of Kafka's operational complexity. Existing Kafka clients and tools connect without modification. With Flux managing the Redpanda cluster configuration, topic creation, and credentials, your event streaming infrastructure is fully described in Git and automatically reconciled. For teams tired of JVM tuning and ZooKeeper operations, Redpanda is a compelling modern alternative.
