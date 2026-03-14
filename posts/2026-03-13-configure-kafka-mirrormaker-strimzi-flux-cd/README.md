# How to Configure Kafka MirrorMaker with Strimzi via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kafka, Strimzi, MirrorMaker, Replication, Disaster Recovery

Description: Configure Kafka MirrorMaker for cluster replication and disaster recovery using Strimzi CRDs and Flux CD GitOps.

---

## Introduction

Kafka MirrorMaker 2 (MM2) is the Kafka tool for replicating topics between clusters. It is built on Kafka Connect and supports bidirectional, active-active replication with offset translation, consumer group synchronization, and configurable topic filters. Common use cases include disaster recovery (primary-to-DR replication), cross-region data distribution, and migration from one Kafka cluster to another.

Strimzi manages MirrorMaker 2 through the `KafkaMirrorMaker2` CRD, which provides a clean declarative API for defining replication flows between clusters. Deploying through Flux CD ensures that replication configuration — which topics to mirror, offset sync frequency, replication factor — is version-controlled and consistently applied.

## Prerequisites

- Two Strimzi Kafka clusters (source and target) with TLS listeners
- Flux CD managing both clusters or at least the one where MirrorMaker runs
- `kubectl` and `flux` CLIs installed

## Step 1: Create KafkaUsers for MirrorMaker

MirrorMaker needs authenticated access to both source and target clusters:

```yaml
# infrastructure/messaging/mirrormaker/mm2-source-user.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: mirror-maker-source
  namespace: kafka-source
  labels:
    strimzi.io/cluster: source-cluster
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      # Read all topics from source
      - resource:
          type: topic
          name: "*"
          patternType: literal
        operations:
          - Read
          - Describe
      # Read all consumer groups
      - resource:
          type: group
          name: "*"
          patternType: literal
        operations:
          - Read
      # Cluster describe
      - resource:
          type: cluster
        operations:
          - Describe
---
# infrastructure/messaging/mirrormaker/mm2-target-user.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: mirror-maker-target
  namespace: kafka-target
  labels:
    strimzi.io/cluster: target-cluster
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      # Write to all topics on target
      - resource:
          type: topic
          name: "*"
          patternType: literal
        operations:
          - Write
          - Create
          - Describe
          - Alter
      # Manage internal MM2 topics
      - resource:
          type: group
          name: "*"
          patternType: literal
        operations:
          - Read
          - Write
      - resource:
          type: cluster
        operations:
          - Describe
          - Alter
```

## Step 2: Deploy KafkaMirrorMaker2

```yaml
# infrastructure/messaging/mirrormaker/mirror-maker.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaMirrorMaker2
metadata:
  name: dr-mirror
  namespace: kafka
spec:
  version: 3.7.1
  replicas: 2

  # Define both clusters
  clusters:
    - alias: source
      bootstrapServers: source-cluster-kafka-bootstrap.kafka-source.svc.cluster.local:9093
      tls:
        trustedCertificates:
          - secretName: source-cluster-ca-cert
            certificate: ca.crt
      authentication:
        type: tls
        certificateAndKey:
          secretName: mirror-maker-source
          certificate: user.crt
          key: user.key

    - alias: target
      bootstrapServers: target-cluster-kafka-bootstrap.kafka-target.svc.cluster.local:9093
      tls:
        trustedCertificates:
          - secretName: target-cluster-ca-cert
            certificate: ca.crt
      authentication:
        type: tls
        certificateAndKey:
          secretName: mirror-maker-target
          certificate: user.crt
          key: user.key
      config:
        # Production settings for the target cluster topics
        replication.factor: "3"
        min.insync.replicas: "2"

  # Replication flows
  mirrors:
    - sourceCluster: source
      targetCluster: target
      sourceConnector:
        # Replicate all topics except internal ones
        config:
          replication.factor: "3"
          offset-syncs.topic.replication.factor: "3"
          sync.topic.acls.enabled: "false"  # don't sync ACLs between clusters
          # Topic filter: mirror all except internal topics
          topics: ".*"
          topics.exclude: "__.*|connect-.*|mirrormaker2-.*"
          # Mirror with source cluster prefix: source.orders
          source.cluster.alias: source
          offset.lag.max: "100"

      # Sync consumer group offsets
      checkpointConnector:
        config:
          checkpoints.topic.replication.factor: "3"
          # Sync offsets every 60 seconds
          sync.group.offsets.enabled: "true"
          sync.group.offsets.interval.seconds: "60"
          # Groups to sync
          groups: ".*"
          groups.exclude: "console-consumer-.*"

      # Heartbeat connector
      heartbeatConnector:
        config:
          heartbeats.topic.replication.factor: "3"

  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "2Gi"

  jvmOptions:
    -Xms: 512m
    -Xmx: 1024m
```

## Step 3: Configure Active-Active Replication

For bidirectional replication (active-active), add a reverse mirror:

```yaml
  mirrors:
    # Forward: source → target
    - sourceCluster: source
      targetCluster: target
      sourceConnector:
        config:
          topics: "app\\..*"  # only mirror application topics
          replication.factor: "3"

    # Reverse: target → source (for DR failback)
    - sourceCluster: target
      targetCluster: source
      sourceConnector:
        config:
          # Don't mirror source.* topics back (would create source.source.topic loops)
          topics: "app\\..*"
          topics.exclude: "source\\..*"
          replication.factor: "3"
```

## Step 4: Flux Kustomization

```yaml
# clusters/production/mirrormaker-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kafka-mirrormaker
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/mirrormaker
  prune: true
  dependsOn:
    - name: strimzi-kafka-source
    - name: strimzi-kafka-target
  healthChecks:
    - apiVersion: kafka.strimzi.io/v1beta2
      kind: KafkaMirrorMaker2
      name: dr-mirror
      namespace: kafka
```

## Step 5: Monitor Replication

```bash
# Check MirrorMaker2 status
kubectl get kafkamirrormaker2 dr-mirror -n kafka

# Check replication lag
kubectl exec -n kafka dr-mirror-mirrormaker2-0 -- \
  curl -s http://localhost:8083/connectors/dr-mirror->target->source.MirrorSourceConnector/status | jq .

# Check consumer group offsets are syncing
kubectl exec -n kafka target-kafka-0 -n kafka-target -- \
  kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group my-app-consumer-group \
  --describe

# List mirrored topics on target (prefixed with "source.")
kubectl exec -n kafka-target target-cluster-kafka-0 -- \
  kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --list | grep "^source\."
```

## Best Practices

- Set `topics.exclude` to prevent MirrorMaker's own internal topics (`mirrormaker2-.*`, `__consumer_offsets`) from being replicated — this causes loops.
- Enable `sync.group.offsets.enabled: "true"` so consumer groups can resume from the correct offset after a DR failover.
- Use `replication.factor: "3"` for all MM2 internal topics on the target cluster for durability.
- Monitor replication lag with the MM2 connector metrics endpoint at port 8083 and alert if lag exceeds your RPO.
- Test DR failover at least quarterly by switching consumers to the target cluster and verifying they can resume processing.

## Conclusion

Strimzi's `KafkaMirrorMaker2` CRD managed by Flux CD gives you a GitOps-managed Kafka replication solution that supports DR, active-active geo-distribution, and online cluster migrations. Consumer group offset synchronization means a DR failover does not reset consumer positions. Every change to the replication configuration — adding topics to mirror, adjusting lag thresholds, enabling bidirectional sync — is a Git commit reviewed by your team and applied automatically.
