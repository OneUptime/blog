# How to Deploy ActiveMQ Artemis Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, ActiveMQ, Artemis, Message Queue, JMS, AMQP

Description: Deploy the ActiveMQ Artemis Operator for enterprise messaging on Kubernetes using Flux CD HelmRelease for GitOps-managed JMS brokers.

---

## Introduction

Apache ActiveMQ Artemis is the next-generation message broker from Apache, combining the high-performance engine from HornetQ with the flexibility of the original ActiveMQ. It supports AMQP, STOMP, MQTT, OpenWire (JMS), and WebSockets, making it a versatile choice for enterprises with diverse messaging protocol requirements.

The ActiveMQ Artemis Operator manages Artemis broker clusters on Kubernetes through `ActiveMQArtemis` CRDs, handling broker configuration, HA with live-backup pairs, and address management (queues and topics). Deploying through Flux CD ensures enterprise messaging configuration is version-controlled and consistently applied.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed

## Step 1: Add the ActiveMQ Artemis Operator HelmRepository

```yaml
# infrastructure/sources/artemis-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: artemis
  namespace: flux-system
spec:
  interval: 12h
  url: https://artemiscloud.io/helm-charts
```

## Step 2: Deploy the Artemis Operator

```yaml
# infrastructure/messaging/artemis/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: activemq-artemis
```

```yaml
# infrastructure/messaging/artemis/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: activemq-artemis-operator
  namespace: activemq-artemis
spec:
  interval: 30m
  chart:
    spec:
      chart: artemis-operator
      version: "1.0.28"
      sourceRef:
        kind: HelmRepository
        name: artemis
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
```

## Step 3: Deploy an ActiveMQ Artemis Cluster

```yaml
# infrastructure/messaging/artemis/artemis-cluster.yaml
apiVersion: broker.amq.io/v1beta1
kind: ActiveMQArtemis
metadata:
  name: production
  namespace: activemq-artemis
spec:
  deploymentPlan:
    # Number of broker instances
    size: 2
    # Persistence for message journals
    persistenceEnabled: true
    # Enable message migration for clustered HA
    messageMigration: true
    # Resource settings
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "2"
        memory: "2Gi"
    # Storage
    storage:
      size: "20Gi"
      storageClassName: premium-ssd
    # Spread brokers across nodes
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              topologyKey: kubernetes.io/hostname
              labelSelector:
                matchLabels:
                  ActiveMQArtemis: production

  # Broker configuration
  brokerProperties:
    - "globalMaxSize=256MiB"
    - "maxDiskUsage=90"
    - "criticalAnalyzer=true"
    - "criticalAnalyzerTimeout=120000"
    - "criticalAnalyzerPolicy=HALT"

  # Acceptors define which protocols are enabled
  acceptors:
    # AMQP acceptor
    - name: amqp
      protocols: amqp
      port: 5672
      expose: false
    # OpenWire/JMS acceptor for legacy Java clients
    - name: openwire
      protocols: openwire
      port: 61616
      expose: false
    # STOMP acceptor
    - name: stomp
      protocols: stomp
      port: 61613
      expose: false
    # MQTT acceptor for IoT
    - name: mqtt
      protocols: mqtt
      port: 1883
      expose: false
    # All-protocols acceptor
    - name: all
      protocols: amqp,stomp,mqtt,openwire
      port: 61617
      expose: false

  # Console (Web UI)
  console:
    expose: true  # creates an OpenShift Route or Ingress

  # Cluster connectivity between brokers
  clustered: true
  clusterProperties:
    - "clusterPassword=ClusterSecret123!"

  # Admin credentials
  adminUser: admin
  adminPassword: "AdminPassword123!"  # use secretRef in production

  # Address settings (queue/topic policies)
  addressSettings:
    applyRule: replace_all
    addressSetting:
      - match: "#"   # apply to all addresses
        deadLetterAddress: DLQ
        expiryAddress: ExpiryQueue
        redeliveryDelay: 5000
        maxRedeliveryDelay: 60000
        redeliveryDelayMultiplier: 2.0
        maxDeliveryAttempts: 5
        messageCounterHistoryDayLimit: 10
        addressFullPolicy: PAGE    # page to disk when memory is full
        maxSizeBytes: 536870912    # 512 MiB per address
```

## Step 4: Create Addresses (Queues and Topics)

```yaml
# infrastructure/messaging/artemis/addresses.yaml
# orders queue
apiVersion: broker.amq.io/v1beta1
kind: ActiveMQArtemisAddress
metadata:
  name: orders-queue
  namespace: activemq-artemis
spec:
  addressName: orders
  queueName: orders.processing
  routingType: anycast    # anycast = queue (one consumer gets each message)
  activeMQArtemisInstance:
    name: production
    namespace: activemq-artemis
---
# notifications topic
apiVersion: broker.amq.io/v1beta1
kind: ActiveMQArtemisAddress
metadata:
  name: notifications-topic
  namespace: activemq-artemis
spec:
  addressName: notifications
  queueName: ""    # multicast doesn't need a default queue name
  routingType: multicast  # multicast = topic (all subscribers get each message)
  activeMQArtemisInstance:
    name: production
    namespace: activemq-artemis
---
# Dead Letter Queue
apiVersion: broker.amq.io/v1beta1
kind: ActiveMQArtemisAddress
metadata:
  name: dead-letter-queue
  namespace: activemq-artemis
spec:
  addressName: DLQ
  queueName: DLQ
  routingType: anycast
  activeMQArtemisInstance:
    name: production
    namespace: activemq-artemis
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/artemis-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: activemq-artemis
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/artemis
  prune: true
  dependsOn:
    - name: artemis-operator
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: production-ss
      namespace: activemq-artemis
```

## Step 6: Verify and Access

```bash
# Check broker pods
kubectl get pods -n activemq-artemis

# Check ActiveMQArtemis status
kubectl get activemqartemis production -n activemq-artemis

# Access Artemis Web Console
kubectl port-forward svc/production-hdls-svc 8161:8161 -n activemq-artemis
# Navigate to http://localhost:8161 (admin/AdminPassword123!)

# Check queue status via jolokia REST API
kubectl exec -n activemq-artemis production-ss-0 -- \
  curl -s -u admin:AdminPassword123! \
  "http://localhost:8161/console/jolokia/exec/org.apache.activemq.artemis:broker=\"0.0.0.0\",component=addresses,address=\"orders\",subcomponent=queues,routing-type=\"anycast\",queue=\"orders.processing\"/messageCount"
```

## Best Practices

- Use `addressFullPolicy: PAGE` to page messages to disk when memory is full rather than blocking producers or dropping messages.
- Configure `deadLetterAddress` and `maxDeliveryAttempts` on all addresses to catch poison messages automatically.
- Use `anycast` routing for queues (point-to-point) and `multicast` for topics (publish-subscribe).
- Enable `clustered: true` with `messageMigration: true` so messages are migrated to surviving brokers during failover.
- Store broker credentials in Kubernetes Secrets and reference them via `adminPasswordSecret` rather than embedding in the CRD.

## Conclusion

The ActiveMQ Artemis Operator deployed via Flux CD provides an enterprise-grade, multi-protocol message broker with HA clustering and rich address management through Kubernetes CRDs. Its support for AMQP, JMS, MQTT, and STOMP makes it the right choice for organizations with diverse messaging protocol requirements. With Flux managing the operator, broker configuration, and address definitions, your enterprise messaging infrastructure is fully GitOps-managed and consistently applied.
