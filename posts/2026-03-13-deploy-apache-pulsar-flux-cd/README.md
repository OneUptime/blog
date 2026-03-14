# How to Deploy Apache Pulsar with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Apache Pulsar, Message Queue, Streaming, Multi-tenancy

Description: Deploy Apache Pulsar distributed messaging and streaming platform on Kubernetes using Flux CD HelmRelease for GitOps-managed Pulsar clusters.

---

## Introduction

Apache Pulsar is a cloud-native, multi-tenant, distributed messaging and streaming platform originally developed at Yahoo. Its architecture separates message serving (brokers) from message storage (BookKeeper), enabling independent scaling of compute and storage. Pulsar supports both traditional pub-sub messaging and Kafka-compatible streaming through Pulsar's Kafka Protocol Handler (KOP).

Pulsar's built-in multi-tenancy (tenants → namespaces → topics) makes it a strong choice for platform teams serving multiple applications. Each team gets a tenant with configurable resource quotas, retention policies, and authentication.

Deploying Pulsar through Flux CD gives you GitOps control over all cluster components: ZooKeeper, BookKeeper, brokers, and Pulsar proxies.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs (SSDs recommended for BookKeeper)
- Minimum 3 nodes with 8+ GiB RAM each
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Pulsar HelmRepository

```yaml
# infrastructure/sources/pulsar-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: pulsar
  namespace: flux-system
spec:
  interval: 12h
  url: https://pulsar.apache.org/charts
```

## Step 2: Create the Namespace

```yaml
# infrastructure/messaging/pulsar/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: pulsar
```

## Step 3: Deploy Apache Pulsar

```yaml
# infrastructure/messaging/pulsar/pulsar-cluster.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: pulsar
  namespace: pulsar
spec:
  interval: 30m
  chart:
    spec:
      chart: pulsar
      version: "3.3.0"
      sourceRef:
        kind: HelmRepository
        name: pulsar
        namespace: flux-system
  timeout: 15m  # Pulsar takes longer to initialize
  values:
    initialize: true  # Run cluster initialization

    # Cluster name
    fullnameOverride: pulsar

    # ZooKeeper (coordination)
    zookeeper:
      replicaCount: 3
      resources:
        requests:
          cpu: "300m"
          memory: "512Mi"
        limits:
          cpu: "500m"
          memory: "1Gi"
      volumes:
        data:
          name: data
          size: 20Gi
          storageClassName: premium-ssd

    # BookKeeper (persistent storage layer)
    bookkeeper:
      replicaCount: 3
      resources:
        requests:
          cpu: "500m"
          memory: "2Gi"
        limits:
          cpu: "1"
          memory: "4Gi"
      volumes:
        journal:
          name: journal
          size: 20Gi
          storageClassName: premium-ssd-high-iops
        ledgers:
          name: ledgers
          size: 100Gi
          storageClassName: premium-ssd
      configData:
        PULSAR_MEM: "-Xms1g -Xmx1g -XX:MaxDirectMemorySize=1g"

    # Pulsar brokers (stateless compute layer)
    broker:
      replicaCount: 3
      resources:
        requests:
          cpu: "500m"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
      configData:
        PULSAR_MEM: "-Xms1g -Xmx1g"
        # Default retention: 7 days
        defaultRetentionTimeInMinutes: "10080"
        # Max message size: 5 MiB
        maxMessageSize: "5242880"
        # Allow auto topic creation
        allowAutoTopicCreation: "true"
        allowAutoTopicCreationType: "non-partitioned"
        # Deduplication
        brokerDeduplicationEnabled: "false"

    # Pulsar Proxy (client-facing gateway)
    proxy:
      replicaCount: 2
      resources:
        requests:
          cpu: "200m"
          memory: "512Mi"
        limits:
          cpu: "500m"
          memory: "1Gi"

    # Pulsar Manager (Web UI)
    pulsar_manager:
      enabled: true
      resources:
        requests:
          cpu: "200m"
          memory: "512Mi"
```

## Step 4: Configure Pulsar Authentication

```yaml
# Additional broker configuration for JWT authentication
    broker:
      configData:
        # Enable authentication
        authenticationEnabled: "true"
        authenticationProviders: "org.apache.pulsar.broker.authentication.AuthenticationProviderToken"
        # JWT secret key (use asymmetric keys for production)
        tokenSecretKey: "file:///pulsar/keys/token/secret.key"
        # Authorization
        authorizationEnabled: "true"
        superUserRoles: "admin,pulsar-client"
```

## Step 5: Create Tenants and Namespaces via Job

```yaml
# infrastructure/messaging/pulsar/setup-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pulsar-setup
  namespace: pulsar
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: pulsar-admin
          image: apachepulsar/pulsar:3.3.0
          command:
            - /bin/sh
            - -c
            - |
              ADMIN="bin/pulsar-admin --admin-url http://pulsar-broker.pulsar.svc.cluster.local:8080"

              # Wait for Pulsar
              until $ADMIN tenants list 2>/dev/null; do
                echo "Waiting for Pulsar broker..."; sleep 10
              done

              # Create tenants
              $ADMIN tenants create orders \
                --admin-roles admin \
                --allowed-clusters pulsar

              $ADMIN tenants create analytics \
                --admin-roles admin \
                --allowed-clusters pulsar

              # Create namespaces
              $ADMIN namespaces create orders/production
              $ADMIN namespaces create analytics/production

              # Set retention: 7 days
              $ADMIN namespaces set-retention orders/production \
                --size -1 --time 7d

              # Set backlog quota
              $ADMIN namespaces set-backlog-quota orders/production \
                --policy producer_request_hold \
                --limit-size 10G

              echo "Pulsar setup complete"
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/pulsar-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: pulsar
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/pulsar
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: pulsar-broker
      namespace: pulsar
  timeout: 15m
```

## Step 7: Verify the Cluster

```bash
# Check all components
kubectl get pods -n pulsar

# Verify brokers are in standalone mode
kubectl exec -n pulsar pulsar-broker-0 -- \
  bin/pulsar-admin brokers list pulsar

# Produce a test message
kubectl exec -n pulsar pulsar-broker-0 -- \
  bin/pulsar-client produce orders/production/my-topic \
  --messages "Hello from Flux CD"

# Consume the message
kubectl exec -n pulsar pulsar-broker-0 -- \
  bin/pulsar-client consume orders/production/my-topic \
  --subscription-name test-sub \
  --num-messages 1
```

## Best Practices

- Use separate disk pools for BookKeeper journal (high IOPS, small) and ledger storage (large, sequential) for optimal performance.
- Set `defaultRetentionTimeInMinutes` at the broker level and override per namespace for fine-grained retention control.
- Enable JWT authentication for all production deployments and create service accounts for each application.
- Monitor BookKeeper write latency — it is the key indicator of Pulsar's message delivery performance.
- Use Pulsar's multi-tenancy to set per-tenant resource quotas preventing one application from consuming all broker capacity.

## Conclusion

Apache Pulsar deployed via Flux CD provides a feature-rich, cloud-native messaging platform with native multi-tenancy, independent scaling of compute and storage, and support for both pub-sub and streaming workloads. Its architecture makes it particularly suitable for platform teams managing messaging infrastructure for multiple application teams. With Flux managing the Pulsar cluster configuration and setup Jobs, your messaging platform is reproducible and consistently configured across environments.
