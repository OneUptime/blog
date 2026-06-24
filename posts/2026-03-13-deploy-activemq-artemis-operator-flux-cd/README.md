# How to Deploy ActiveMQ Artemis Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, ActiveMQ, Artemis, Message Queue, JMS, AMQP

Description: Deploy the ActiveMQ Artemis Operator for enterprise messaging on Kubernetes using Flux CD HelmRelease for GitOps-managed JMS brokers.

---

## Introduction

Apache ActiveMQ Artemis is the next-generation message broker from Apache, combining the high-performance engine from HornetQ with the flexibility of the original ActiveMQ. It supports AMQP, STOMP, MQTT, OpenWire, and WebSockets, making it a versatile choice for enterprises with diverse messaging protocol requirements.

The ActiveMQ Artemis Operator manages Artemis broker clusters on Kubernetes through `ActiveMQArtemis` CRDs, handling broker configuration, clustering, message migration, and address management (queues and topics). Deploying through Flux CD ensures enterprise messaging configuration is version-controlled and consistently applied.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed

## Step 1: Add the ActiveMQ Artemis Operator GitRepository

```yaml
# infrastructure/sources/artemis-operator.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: activemq-artemis-operator
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/artemiscloud/activemq-artemis-operator
  ref:
    tag: "1.2.8"
  ignore: |
    /*
    !/deploy/
    /deploy/*
    !/deploy/activemq-artemis-operator.yaml
```

## Step 2: Deploy the Artemis Operator

```yaml
# infrastructure/messaging/artemis/broker/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: activemq-artemis-operator
```

```yaml
# clusters/production/artemis-operator-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: artemis-operator
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: activemq-artemis-operator
  path: ./deploy
  prune: true
  wait: true
  timeout: 5m
```

## Step 3: Deploy an ActiveMQ Artemis Cluster

```yaml
# infrastructure/messaging/artemis/broker/artemis-cluster.yaml
apiVersion: broker.amq.io/v1beta1
kind: ActiveMQArtemis
metadata:
  name: production
  namespace: activemq-artemis-operator
spec:
  deploymentPlan:
    # Number of broker instances
    size: 2
    # Cluster connectivity between brokers
    clustered: true
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
    - 'addressSettings."#".deadLetterAddress=DLQ'
    - 'addressSettings."#".expiryAddress=ExpiryQueue'
    - 'addressSettings."#".redeliveryDelay=5000'
    - 'addressSettings."#".maxRedeliveryDelay=60000'
    - 'addressSettings."#".redeliveryMultiplier=2.0'
    - 'addressSettings."#".maxDeliveryAttempts=5'
    - 'addressSettings."#".messageCounterHistoryDayLimit=10'
    - 'addressSettings."#".addressFullMessagePolicy=PAGE'
    - 'addressSettings."#".maxSizeBytes=536870912'
    - 'addressConfigurations."orders".routingTypes=ANYCAST'
    - 'addressConfigurations."orders".queueConfigs."orders.processing".routingType=ANYCAST'
    - 'addressConfigurations."notifications".routingTypes=MULTICAST'
    - 'addressConfigurations."DLQ".routingTypes=ANYCAST'
    - 'addressConfigurations."DLQ".queueConfigs."DLQ".routingType=ANYCAST'
    - 'addressConfigurations."ExpiryQueue".routingTypes=ANYCAST'
    - 'addressConfigurations."ExpiryQueue".queueConfigs."ExpiryQueue".routingType=ANYCAST'

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

  # Admin credentials
  adminUser: admin
  adminPassword: "AdminPassword123!"  # use a credential Secret in production
```

## Step 4: Create Addresses (Queues and Topics)

```yaml
# infrastructure/messaging/artemis/broker/artemis-cluster.yaml
# The address and queue definitions are configured in spec.brokerProperties:
#
# orders queue
#   addressConfigurations."orders".routingTypes=ANYCAST
#   addressConfigurations."orders".queueConfigs."orders.processing".routingType=ANYCAST
#
# notifications topic
#   addressConfigurations."notifications".routingTypes=MULTICAST
#
# Dead Letter Queue
#   addressConfigurations."DLQ".routingTypes=ANYCAST
#   addressConfigurations."DLQ".queueConfigs."DLQ".routingType=ANYCAST
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
  path: ./infrastructure/messaging/artemis/broker
  prune: true
  dependsOn:
    - name: artemis-operator
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: production-ss
      namespace: activemq-artemis-operator
```

## Step 6: Verify and Access

```bash
# Check broker pods
kubectl get pods -n activemq-artemis-operator

# Check ActiveMQArtemis status
kubectl get activemqartemis production -n activemq-artemis-operator

# Access Artemis Web Console
kubectl port-forward svc/production-hdls-svc 8161:8161 -n activemq-artemis-operator
# Navigate to http://localhost:8161/console (admin/AdminPassword123!)

# Check queue status via jolokia REST API
kubectl exec -n activemq-artemis-operator production-ss-0 -- \
  curl -s -H "Origin: http://localhost:8161" -u 'admin:AdminPassword123!' \
  "http://localhost:8161/console/jolokia/read/org.apache.activemq.artemis:broker=\"amq-broker\",component=addresses,address=\"orders\",subcomponent=queues,routing-type=\"anycast\",queue=\"orders.processing\"/MessageCount"
```

## Best Practices

- Use `addressSettings."#".addressFullMessagePolicy=PAGE` to page messages to disk when memory is full rather than blocking producers or dropping messages.
- Configure `deadLetterAddress` and `maxDeliveryAttempts` on all addresses to catch poison messages automatically.
- Use `anycast` routing for queues (point-to-point) and `multicast` for topics (publish-subscribe).
- Enable `deploymentPlan.clustered: true` with `messageMigration: true` so messages are migrated to another running broker when a broker Pod shuts down or is scaled down.
- Store broker credentials in the `<broker-name>-credentials-secret` Kubernetes Secret with `AMQ_USER` and `AMQ_PASSWORD` keys rather than embedding them in the CRD.

## Conclusion

The ActiveMQ Artemis Operator deployed via Flux CD provides an enterprise-grade, multi-protocol message broker with HA clustering and rich address management through Kubernetes CRDs. Its support for AMQP, JMS, MQTT, and STOMP makes it the right choice for organizations with diverse messaging protocol requirements. With Flux managing the operator, broker configuration, and address definitions, your enterprise messaging infrastructure is fully GitOps-managed and consistently applied.
