# How to Deploy RabbitMQ Cluster Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, RabbitMQ, Message Queue, AMQP, Database Operators

Description: Deploy the RabbitMQ Cluster Kubernetes Operator for managed RabbitMQ clusters using Flux CD HelmRelease.

---

## Introduction

RabbitMQ is one of the most widely deployed open-source message brokers, supporting AMQP, MQTT, and STOMP protocols. The RabbitMQ Cluster Kubernetes Operator, maintained by the RabbitMQ team at VMware (now Broadcom), automates RabbitMQ cluster deployment, HA configuration, and upgrades through the `RabbitmqCluster` CRD.

Deploying RabbitMQ through Flux CD ensures your message broker topology, configuration, and credentials are version-controlled. Adding a plugin, adjusting memory thresholds, or scaling the cluster are Git commits reviewed by your team and applied automatically.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed

## Step 1: Add the RabbitMQ HelmRepository

```yaml
# infrastructure/sources/rabbitmq-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: rabbitmq
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.bitnami.com/bitnami
```

## Step 2: Deploy the RabbitMQ Cluster Operator

```yaml
# infrastructure/messaging/rabbitmq/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rabbitmq-system
```

```yaml
# infrastructure/messaging/rabbitmq/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: rabbitmq-cluster-operator
  namespace: rabbitmq-system
spec:
  interval: 30m
  chart:
    spec:
      chart: rabbitmq-cluster-operator
      version: "4.3.25"
      sourceRef:
        kind: HelmRepository
        name: rabbitmq
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    clusterOperator:
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "300m"
          memory: "256Mi"
    msgTopologyOperator:
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "300m"
          memory: "256Mi"
```

## Step 3: Create a RabbitMQ Cluster

```yaml
# infrastructure/messaging/rabbitmq/rabbitmq-cluster.yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: production
  namespace: rabbitmq
spec:
  # Number of RabbitMQ nodes
  replicas: 3

  # RabbitMQ image
  image: rabbitmq:3.13.4-management

  # Persistent storage
  persistence:
    storageClassName: premium-ssd
    storage: "10Gi"

  # Resources
  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "2Gi"

  rabbitmq:
    # Additional plugins to enable
    additionalPlugins:
      - rabbitmq_management
      - rabbitmq_peer_discovery_k8s
      - rabbitmq_prometheus   # Prometheus metrics
      - rabbitmq_shovel       # Message shovel (cross-cluster forwarding)
      - rabbitmq_shovel_management

    # RabbitMQ configuration
    additionalConfig: |
      # Memory high watermark (stop accepting publishes at 70% RAM usage)
      vm_memory_high_watermark.relative = 0.70
      # Disk free space alarm threshold
      disk_free_limit.absolute = 2GB
      # Heartbeat timeout
      heartbeat = 60
      # Consumer timeout: cancel slow consumers after 30 minutes
      consumer_timeout = 1800000
      # Log level
      log.console.level = info
      # Default message TTL (not set by default)
      # x-message-ttl = 86400000  # 24 hours (set per queue)

  # TLS configuration
  tls:
    secretName: rabbitmq-tls-secret
    disableNonTLSListeners: false   # keep AMQP available for migration

  # Service configuration
  service:
    type: ClusterIP
    annotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "15692"

  # Anti-affinity: one RabbitMQ node per Kubernetes node
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - topologyKey: kubernetes.io/hostname
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: production

  override:
    statefulSet:
      spec:
        template:
          spec:
            containers:
              - name: rabbitmq
                env:
                  - name: RABBITMQ_DEFAULT_USER
                    valueFrom:
                      secretKeyRef:
                        name: production-default-user
                        key: username
                  - name: RABBITMQ_DEFAULT_PASS
                    valueFrom:
                      secretKeyRef:
                        name: production-default-user
                        key: password
```

## Step 4: The Operator Auto-Creates Default User Secret

The RabbitMQ Cluster Operator automatically creates a Secret named `<cluster-name>-default-user` with admin credentials. To customize the password:

```yaml
# infrastructure/messaging/rabbitmq/rabbitmq-secret.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: production-default-user
  namespace: rabbitmq
type: Opaque
stringData:
  username: admin
  password: "RabbitMQPassword123!"
  # Connection string (auto-used by applications)
  host: "production.rabbitmq.svc.cluster.local"
  port: "5672"
  default_user: admin
  default_pass: "RabbitMQPassword123!"
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/rabbitmq-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rabbitmq-cluster
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/rabbitmq
  prune: true
  dependsOn:
    - name: rabbitmq-operator
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: production
      namespace: rabbitmq
```

## Step 6: Verify and Access

```bash
# Check cluster status
kubectl get rabbitmqcluster production -n rabbitmq

# Check all pods
kubectl get pods -n rabbitmq

# Get connection credentials
kubectl get secret production-default-user -n rabbitmq \
  -o jsonpath='{.data.password}' | base64 -d

# Access RabbitMQ Management UI
kubectl port-forward svc/production 15672:15672 -n rabbitmq
# Navigate to http://localhost:15672

# Check cluster status via CLI
kubectl exec -n rabbitmq production-server-0 -- rabbitmqctl cluster_status

# Check node health
kubectl exec -n rabbitmq production-server-0 -- rabbitmqctl node_health_check
```

## Best Practices

- Run 3 or more replicas with an odd number for quorum queue quorum - quorum queues replace classic mirrored queues as the HA mechanism.
- Set `vm_memory_high_watermark.relative = 0.70` to trigger back-pressure before OOM conditions.
- Enable the `rabbitmq_prometheus` plugin and scrape the `/metrics` endpoint for Grafana dashboards.
- Use quorum queues (declared with `x-queue-type: quorum`) for HA - they are replicated using Raft and survive node losses.
- Set TLS on the AMQP listener for production environments where clients are outside the cluster network.

## Conclusion

The RabbitMQ Cluster Operator deployed via Flux CD provides a GitOps-managed AMQP message broker with automatic clustering, rolling upgrades, and plugin management. The `RabbitmqCluster` CRD gives your team a clean Kubernetes-native API for expressing broker configuration. Combined with the Topology Operator (covered in the next post) for queue and exchange management, you get a fully declarative RabbitMQ infrastructure described entirely in Git.
