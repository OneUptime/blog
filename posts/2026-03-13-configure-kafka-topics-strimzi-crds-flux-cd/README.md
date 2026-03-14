# How to Configure Kafka Topics with Strimzi CRDs via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kafka, Strimzi, KafkaTopic, Topic Management

Description: Manage Kafka KafkaTopic resources using Strimzi and Flux CD GitOps for version-controlled, declarative topic administration.

---

## Introduction

One of Strimzi's most powerful features is its Topic Operator, which synchronizes `KafkaTopic` Kubernetes resources with actual Kafka topics. This means your entire Kafka topic catalog - partitions, replication factor, retention settings, cleanup policies - lives in Git as Kubernetes YAML files. Adding a topic is a pull request, and Strimzi's Topic Operator applies it automatically.

Managing topics through Flux CD extends this to multi-cluster GitOps: the same topic definitions can be promoted from development to staging to production through standard Flux promotion workflows, ensuring topics are configured consistently across environments.

## Prerequisites

- Strimzi Kafka Operator with a running Kafka cluster (see previous post)
- Flux CD bootstrapped with the Strimzi cluster in scope
- `kubectl` and `flux` CLIs installed

## Step 1: Understand KafkaTopic Resource Structure

A `KafkaTopic` resource maps directly to a Kafka topic with all its configuration:

```yaml
# The minimal KafkaTopic structure:
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: <topic-name>          # Kubernetes resource name (used as Kafka topic name by default)
  namespace: kafka
  labels:
    strimzi.io/cluster: production  # MUST match the Kafka cluster name
spec:
  partitions: <count>
  replicas: <replication-factor>
  config:
    <kafka-config-key>: "<value>"
```

## Step 2: Create Topic Definitions for Different Use Cases

Organize topics in a dedicated directory:

```yaml
# infrastructure/messaging/topics/orders-topic.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: orders
  namespace: kafka
  labels:
    strimzi.io/cluster: production
    app: orders-service
    team: commerce
spec:
  # High-throughput order events - many partitions for parallel consumption
  partitions: 12
  replicas: 3
  config:
    # 7 days retention
    retention.ms: "604800000"
    # 10 GiB max storage per partition
    retention.bytes: "10737418240"
    # Compact old messages after 1 day (for event sourcing)
    cleanup.policy: delete
    # Snappy compression reduces storage by ~50%
    compression.type: snappy
    # Minimum in-sync replicas before producer gets acknowledgement
    min.insync.replicas: "2"
    # Segment size: roll new segment every 1 GiB
    segment.bytes: "1073741824"
```

```yaml
# infrastructure/messaging/topics/user-events-topic.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: user-events
  namespace: kafka
  labels:
    strimzi.io/cluster: production
    app: user-service
    team: platform
spec:
  partitions: 6
  replicas: 3
  config:
    # 30 days retention for compliance
    retention.ms: "2592000000"
    cleanup.policy: delete
    compression.type: snappy
    min.insync.replicas: "2"
```

```yaml
# infrastructure/messaging/topics/deadletter-topic.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: dead-letter
  namespace: kafka
  labels:
    strimzi.io/cluster: production
spec:
  # Single partition for dead letter - order doesn't matter
  partitions: 1
  replicas: 3
  config:
    # Keep dead letters for 90 days
    retention.ms: "7776000000"
    cleanup.policy: delete
    compression.type: gzip
    min.insync.replicas: "2"
```

```yaml
# infrastructure/messaging/topics/audit-log-topic.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: audit-log
  namespace: kafka
  labels:
    strimzi.io/cluster: production
    compliance: required
spec:
  partitions: 3
  replicas: 3
  config:
    # Compacted topic: keep latest value per key (for audit trails)
    cleanup.policy: compact
    # Minimum time before compaction (1 day)
    min.compaction.lag.ms: "86400000"
    # Maximum message age before compaction eligibility (7 days)
    max.compaction.lag.ms: "604800000"
    compression.type: gzip
    min.insync.replicas: "2"
```

## Step 3: Use Kustomize for Environment-Specific Partitioning

Staging may need fewer partitions to save resources:

```yaml
# infrastructure/messaging/topics/staging/partitions-patch.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: orders
  namespace: kafka
spec:
  partitions: 3    # fewer partitions in staging
  replicas: 1      # single replica in staging (no HA needed)
```

```yaml
# infrastructure/messaging/topics/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../production
patches:
  - path: partitions-patch.yaml
```

## Step 4: Manage Topic Configuration Updates

To update a topic's retention or partition count, simply edit the YAML and commit. The Topic Operator applies the change:

```bash
# In Git, change retention.ms from 604800000 (7 days) to 2592000000 (30 days)
# Commit and push

# Verify the change was applied
kubectl get kafkatopic orders -n kafka -o yaml | grep retention

# Check Topic Operator applied the change
kubectl logs -n kafka deployment/production-entity-operator \
  -c topic-operator --tail=20
```

**Important**: Kafka does not support reducing partition counts. Attempting to reduce partitions will result in an error from the Topic Operator.

## Step 5: Flux Kustomization for Topics

```yaml
# clusters/production/kafka-topics-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kafka-topics
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/topics/production
  prune: true   # deleting the YAML deletes the topic (use carefully!)
  dependsOn:
    - name: strimzi-kafka
```

## Step 6: Verify Topics

```bash
# List all KafkaTopic resources
kubectl get kafkatopics -n kafka

# Check a specific topic's status
kubectl describe kafkatopic orders -n kafka

# Verify topic exists in Kafka
kubectl exec -n kafka production-kafka-0 -- \
  kafka-topics.sh \
  --bootstrap-server production-kafka-bootstrap:9092 \
  --describe \
  --topic orders

# List partitions and replication
kubectl exec -n kafka production-kafka-0 -- \
  kafka-topics.sh \
  --bootstrap-server production-kafka-bootstrap:9092 \
  --list
```

## Best Practices

- Align `partitions` count with your maximum expected consumer parallelism - you cannot reduce partitions later.
- Set `min.insync.replicas: "2"` for all production topics and pair it with producer `acks=all` for durability guarantees.
- Use `cleanup.policy: compact` for topics used as event-sourced state stores, and `delete` for event streams.
- Be careful with `prune: true` on the topics Kustomization - if a team accidentally deletes a YAML file, the topic (and its data) will be deleted.
- Label topics with `team` and `app` labels for accountability and to enable team-specific RBAC on KafkaTopic resources.

## Conclusion

Managing Kafka topics through `KafkaTopic` CRDs with Flux CD gives you a fully declarative, version-controlled topic catalog. Every topic creation, retention change, or partition increase is a Git commit with a clear audit trail. Strimzi's Topic Operator ensures the actual Kafka topic configuration matches your declared state, eliminating configuration drift and making your event streaming infrastructure as reproducible as your application workloads.
