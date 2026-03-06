# How to Deploy RabbitMQ Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, rabbitmq, operator, message queue, amqp, gitops, kubernetes, messaging

Description: A practical guide to deploying the RabbitMQ Cluster Operator on Kubernetes using Flux CD for Kubernetes-native RabbitMQ cluster management.

---

## Introduction

RabbitMQ is a widely used open-source message broker that supports multiple messaging protocols including AMQP, MQTT, and STOMP. The RabbitMQ Cluster Operator for Kubernetes provides a declarative way to manage RabbitMQ clusters through custom resources. Deploying the operator with Flux CD enables GitOps-driven management of your message queuing infrastructure, where cluster configurations, policies, and user permissions are all tracked in Git.

This guide covers deploying the RabbitMQ Cluster Operator using Flux CD, creating RabbitMQ clusters, defining queues and policies, and configuring high availability.

## Prerequisites

- A Kubernetes cluster (v1.26 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- Persistent storage available

## Repository Structure

```
clusters/
  my-cluster/
    rabbitmq/
      namespace.yaml
      helmrepository.yaml
      operator.yaml
      rabbitmq-cluster.yaml
      queues.yaml
      policies.yaml
      users.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/rabbitmq/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rabbitmq
  labels:
    toolkit.fluxcd.io/tenant: messaging
```

## Step 2: Add the Helm Repository

```yaml
# clusters/my-cluster/rabbitmq/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: rabbitmq
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
```

## Step 3: Deploy the RabbitMQ Cluster Operator

Install the operator that will manage RabbitMQ cluster lifecycle.

```yaml
# clusters/my-cluster/rabbitmq/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: rabbitmq-cluster-operator
  namespace: rabbitmq
spec:
  interval: 30m
  chart:
    spec:
      chart: rabbitmq-cluster-operator
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
      interval: 12h
  timeout: 10m
  values:
    # Operator configuration
    clusterOperator:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi
      # Watch all namespaces for RabbitmqCluster resources
      watchAllNamespaces: true

    # Messaging Topology Operator manages queues, exchanges, bindings, etc.
    msgTopologyOperator:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi

    # Install RabbitMQ CRDs
    useCertManager: false
```

## Step 4: Create the RabbitMQ Cluster

Define a highly available RabbitMQ cluster using the operator's custom resource.

```yaml
# clusters/my-cluster/rabbitmq/rabbitmq-cluster.yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: production-rabbitmq
  namespace: rabbitmq
spec:
  # Number of RabbitMQ nodes (use odd numbers for quorum)
  replicas: 3

  # RabbitMQ Docker image
  image: rabbitmq:3.13-management

  # Resource allocation per node
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: "2"
      memory: 2Gi

  # Persistent storage for message data
  persistence:
    storageClassName: standard
    storage: 20Gi

  # RabbitMQ configuration
  rabbitmq:
    additionalConfig: |
      # Cluster formation settings
      cluster_formation.peer_discovery_backend = rabbit_peer_discovery_k8s
      cluster_formation.k8s.host = kubernetes.default.svc.cluster.local
      cluster_formation.k8s.address_type = hostname

      # Memory management
      vm_memory_high_watermark.relative = 0.7
      vm_memory_high_watermark_paging_ratio = 0.85

      # Disk free space limit (stop accepting messages below this)
      disk_free_limit.absolute = 2GB

      # Queue settings
      default_queue_type = quorum

      # Connection and channel limits
      channel_max = 2047

      # Management plugin settings
      management.tcp.port = 15672
      management.cors.allow_origins.1 = *

      # Prometheus metrics
      prometheus.return_per_object_metrics = true

      # Consumer timeout (30 minutes)
      consumer_timeout = 1800000

    # Enable additional plugins
    additionalPlugins:
      - rabbitmq_management
      - rabbitmq_prometheus
      - rabbitmq_shovel
      - rabbitmq_shovel_management
      - rabbitmq_consistent_hash_exchange

  # TLS configuration (optional)
  tls:
    secretName: ""

  # Pod scheduling
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/name: production-rabbitmq
          topologyKey: kubernetes.io/hostname

  # Override for service configuration
  override:
    service:
      spec:
        type: ClusterIP
        ports:
          - name: amqp
            port: 5672
            targetPort: 5672
          - name: management
            port: 15672
            targetPort: 15672
          - name: prometheus
            port: 15692
            targetPort: 15692
```

## Step 5: Define Queues and Exchanges

Use the Messaging Topology Operator to declaratively manage queues, exchanges, and bindings.

```yaml
# clusters/my-cluster/rabbitmq/queues.yaml

# Create a durable quorum queue for order processing
apiVersion: rabbitmq.com/v1beta1
kind: Queue
metadata:
  name: orders-queue
  namespace: rabbitmq
spec:
  name: orders
  # Reference to the RabbitMQ cluster
  rabbitmqClusterReference:
    name: production-rabbitmq
  # Quorum queue for high availability
  type: quorum
  durable: true
  autoDelete: false
  arguments:
    # Dead letter exchange for failed messages
    x-dead-letter-exchange: dlx
    x-dead-letter-routing-key: orders.dead
    # Delivery limit before dead-lettering
    x-delivery-limit: 5
    # Maximum queue length
    x-max-length: 100000
---
# Create a queue for notifications
apiVersion: rabbitmq.com/v1beta1
kind: Queue
metadata:
  name: notifications-queue
  namespace: rabbitmq
spec:
  name: notifications
  rabbitmqClusterReference:
    name: production-rabbitmq
  type: quorum
  durable: true
  autoDelete: false
  arguments:
    x-dead-letter-exchange: dlx
    x-dead-letter-routing-key: notifications.dead
    x-delivery-limit: 3
---
# Create a dead letter queue
apiVersion: rabbitmq.com/v1beta1
kind: Queue
metadata:
  name: dead-letter-queue
  namespace: rabbitmq
spec:
  name: dead-letter
  rabbitmqClusterReference:
    name: production-rabbitmq
  type: quorum
  durable: true
  autoDelete: false
  arguments:
    # Keep dead letters for 30 days
    x-message-ttl: 2592000000
---
# Create a topic exchange for event routing
apiVersion: rabbitmq.com/v1beta1
kind: Exchange
metadata:
  name: events-exchange
  namespace: rabbitmq
spec:
  name: events
  rabbitmqClusterReference:
    name: production-rabbitmq
  type: topic
  durable: true
  autoDelete: false
---
# Create the dead letter exchange
apiVersion: rabbitmq.com/v1beta1
kind: Exchange
metadata:
  name: dlx-exchange
  namespace: rabbitmq
spec:
  name: dlx
  rabbitmqClusterReference:
    name: production-rabbitmq
  type: direct
  durable: true
  autoDelete: false
---
# Bind the orders queue to the events exchange
apiVersion: rabbitmq.com/v1beta1
kind: Binding
metadata:
  name: orders-binding
  namespace: rabbitmq
spec:
  rabbitmqClusterReference:
    name: production-rabbitmq
  source: events
  destination: orders
  destinationType: queue
  routingKey: "order.*"
---
# Bind the notifications queue to the events exchange
apiVersion: rabbitmq.com/v1beta1
kind: Binding
metadata:
  name: notifications-binding
  namespace: rabbitmq
spec:
  rabbitmqClusterReference:
    name: production-rabbitmq
  source: events
  destination: notifications
  destinationType: queue
  routingKey: "notification.*"
---
# Bind dead letter queue to the DLX exchange
apiVersion: rabbitmq.com/v1beta1
kind: Binding
metadata:
  name: dead-letter-orders-binding
  namespace: rabbitmq
spec:
  rabbitmqClusterReference:
    name: production-rabbitmq
  source: dlx
  destination: dead-letter
  destinationType: queue
  routingKey: "orders.dead"
```

## Step 6: Define Policies

Configure RabbitMQ policies for queue management.

```yaml
# clusters/my-cluster/rabbitmq/policies.yaml
apiVersion: rabbitmq.com/v1beta1
kind: Policy
metadata:
  name: ha-policy
  namespace: rabbitmq
spec:
  name: ha-all-queues
  rabbitmqClusterReference:
    name: production-rabbitmq
  # Apply to all queues
  pattern: ".*"
  applyTo: queues
  definition:
    # Queue length limit
    max-length: 500000
    # Overflow behavior
    overflow: reject-publish
```

## Step 7: Define Users and Permissions

```yaml
# clusters/my-cluster/rabbitmq/users.yaml
apiVersion: rabbitmq.com/v1beta1
kind: User
metadata:
  name: app-producer
  namespace: rabbitmq
spec:
  rabbitmqClusterReference:
    name: production-rabbitmq
  tags:
    - management
---
apiVersion: rabbitmq.com/v1beta1
kind: Permission
metadata:
  name: app-producer-permission
  namespace: rabbitmq
spec:
  rabbitmqClusterReference:
    name: production-rabbitmq
  userReference:
    name: app-producer
  vhost: "/"
  permissions:
    # Allow configuring resources matching this pattern
    configure: ""
    # Allow writing to exchanges matching this pattern
    write: "^(events|orders|notifications)$"
    # Allow reading from queues matching this pattern
    read: ""
---
apiVersion: rabbitmq.com/v1beta1
kind: User
metadata:
  name: app-consumer
  namespace: rabbitmq
spec:
  rabbitmqClusterReference:
    name: production-rabbitmq
  tags:
    - management
---
apiVersion: rabbitmq.com/v1beta1
kind: Permission
metadata:
  name: app-consumer-permission
  namespace: rabbitmq
spec:
  rabbitmqClusterReference:
    name: production-rabbitmq
  userReference:
    name: app-consumer
  vhost: "/"
  permissions:
    configure: ""
    write: ""
    # Allow reading from all queues
    read: ".*"
```

## Step 8: Create the Kustomization

```yaml
# clusters/my-cluster/rabbitmq/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - operator.yaml
  - rabbitmq-cluster.yaml
  - queues.yaml
  - policies.yaml
  - users.yaml
```

## Step 9: Create the Flux Kustomization

```yaml
# clusters/my-cluster/rabbitmq-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rabbitmq
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: rabbitmq
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/rabbitmq
  prune: true
  wait: true
  timeout: 15m
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v1
      kind: HelmRelease
      name: rabbitmq-cluster-operator
      namespace: rabbitmq
```

## Step 10: Configure Monitoring

Set up a ServiceMonitor for Prometheus to scrape RabbitMQ metrics.

```yaml
# clusters/my-cluster/rabbitmq/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rabbitmq-metrics
  namespace: rabbitmq
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: production-rabbitmq
  endpoints:
    - port: prometheus
      interval: 30s
      path: /metrics
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations rabbitmq

# Check operator HelmRelease
flux get helmreleases -n rabbitmq

# Verify operator pods
kubectl get pods -n rabbitmq -l app.kubernetes.io/name=rabbitmq-cluster-operator

# Check RabbitMQ cluster status
kubectl get rabbitmqclusters -n rabbitmq

# Verify all RabbitMQ nodes are running
kubectl get pods -n rabbitmq -l app.kubernetes.io/name=production-rabbitmq

# Check queues
kubectl get queues -n rabbitmq

# Check exchanges
kubectl get exchanges -n rabbitmq

# Check users
kubectl get users -n rabbitmq

# Access the management UI
kubectl port-forward -n rabbitmq svc/production-rabbitmq 15672:15672

# Get the default admin credentials
kubectl get secret -n rabbitmq production-rabbitmq-default-user -o jsonpath='{.data.username}' | base64 -d
kubectl get secret -n rabbitmq production-rabbitmq-default-user -o jsonpath='{.data.password}' | base64 -d
```

## Troubleshooting

- **Cluster not forming**: Check pod logs for Erlang distribution errors. Verify DNS resolution between pods is working.
- **Queues not being created**: Ensure the Messaging Topology Operator is running. Check that the `rabbitmqClusterReference` matches the cluster name.
- **Memory alarm triggered**: RabbitMQ stops accepting messages when the memory watermark is reached. Increase memory limits or consume pending messages.
- **Disk alarm triggered**: Free up disk space or increase the PVC size. Check the `disk_free_limit` setting.
- **Connection refused**: Verify the service is running and the port is correct. For AMQP, use port 5672. For management UI, use port 15672.

## Conclusion

You have deployed the RabbitMQ Cluster Operator on Kubernetes using Flux CD. The operator provides Kubernetes-native management of RabbitMQ clusters, queues, exchanges, bindings, users, and policies through custom resources. Combined with Flux CD, this creates a fully GitOps-driven messaging platform where all message broker configuration is tracked in version control. You can extend this setup by configuring shovel for cross-cluster message forwarding, setting up federation for distributed deployments, or integrating with external monitoring systems through the Prometheus metrics endpoint.
