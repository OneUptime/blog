# How to Use HelmRelease for Deploying RabbitMQ with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, RabbitMQ, Messaging, AMQP, Bitnami

Description: Learn how to deploy RabbitMQ on Kubernetes using a Flux HelmRelease with the Bitnami Helm chart for reliable message queuing.

---

RabbitMQ is a widely used open-source message broker that supports multiple messaging protocols including AMQP, MQTT, and STOMP. It excels at reliable message delivery, flexible routing, and has a mature management interface. Deploying RabbitMQ through Flux CD with the Bitnami Helm chart ensures your messaging infrastructure is declaratively managed and reproducible.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- Persistent volume provisioner available in your cluster

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

## Deploying RabbitMQ with HelmRelease

The following HelmRelease deploys a RabbitMQ cluster with three nodes, persistent storage, the management plugin enabled, and Prometheus metrics.

```yaml
# helmrelease-rabbitmq.yaml - RabbitMQ cluster deployment via Flux using Bitnami chart
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: rabbitmq
  namespace: rabbitmq
spec:
  interval: 15m
  chart:
    spec:
      chart: rabbitmq
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 10m
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # Authentication configuration
    auth:
      username: admin
      password: "changeme-use-secret"
      # Erlang cookie for cluster communication
      erlangCookie: "changeme-erlang-cookie"

    # Number of RabbitMQ replicas for clustering
    replicaCount: 3

    # Resource requests and limits
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi

    # Persistent storage for messages and metadata
    persistence:
      enabled: true
      size: 20Gi
      accessModes:
        - ReadWriteOnce

    # RabbitMQ plugins to enable
    plugins: "rabbitmq_management rabbitmq_peer_discovery_k8s rabbitmq_prometheus rabbitmq_shovel rabbitmq_shovel_management"

    # Community plugins to install
    communityPlugins: ""

    # Extra configuration for RabbitMQ
    extraConfiguration: |
      ## Consumer timeout (30 minutes)
      consumer_timeout = 1800000
      ## Default virtual host
      default_vhost = /
      ## Default permissions for the guest user
      default_permissions.configure = .*
      default_permissions.read = .*
      default_permissions.write = .*
      ## Memory high watermark (60% of container limit)
      vm_memory_high_watermark.relative = 0.6
      ## Disk free space limit
      disk_free_limit.absolute = 2GB
      ## Queue mirroring policy
      cluster_formation.peer_discovery_backend = rabbit_peer_discovery_k8s
      cluster_formation.k8s.host = kubernetes.default.svc.cluster.local
      cluster_formation.k8s.address_type = hostname

    # Service configuration
    service:
      type: ClusterIP
      # AMQP port
      ports:
        amqp: 5672
        # Management UI port
        manager: 15672
        # Prometheus metrics port
        metrics: 9419

    # Ingress for the management UI
    ingress:
      enabled: true
      ingressClassName: nginx
      hostname: rabbitmq.example.com
      annotations:
        cert-manager.io/cluster-issuer: "letsencrypt-production"
      tls: true

    # Prometheus metrics
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
        namespace: rabbitmq

    # Pod disruption budget
    pdb:
      create: true
      minAvailable: 2

    # Pod anti-affinity
    podAntiAffinityPreset: hard

    # Network policy
    networkPolicy:
      enabled: true
      allowExternal: true
```

## Using Secrets for Credentials

In production, store RabbitMQ credentials in a Kubernetes Secret.

```yaml
# rabbitmq-credentials.yaml - Secret for RabbitMQ credentials
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-credentials
  namespace: rabbitmq
type: Opaque
stringData:
  rabbitmq-password: "secure-admin-password"
  rabbitmq-erlang-cookie: "secure-random-erlang-cookie-string"
```

Reference the Secret in the HelmRelease:

```yaml
# Snippet: Reference credentials from a Secret
spec:
  valuesFrom:
    - kind: Secret
      name: rabbitmq-credentials
      valuesKey: rabbitmq-password
      targetPath: auth.password
    - kind: Secret
      name: rabbitmq-credentials
      valuesKey: rabbitmq-erlang-cookie
      targetPath: auth.erlangCookie
```

## Connecting Applications to RabbitMQ

Applications can connect using the AMQP protocol through the internal service endpoint.

```bash
# AMQP connection endpoint
rabbitmq.rabbitmq.svc.cluster.local:5672

# Management API endpoint
rabbitmq.rabbitmq.svc.cluster.local:15672
```

Example connection configuration for an application:

```yaml
# Snippet: Application environment variables for RabbitMQ connection
env:
  - name: RABBITMQ_URL
    value: "amqp://admin:changeme-use-secret@rabbitmq.rabbitmq.svc.cluster.local:5672/"
  - name: RABBITMQ_VHOST
    value: "/"
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmrelease rabbitmq -n rabbitmq

# Verify all RabbitMQ pods are running
kubectl get pods -n rabbitmq

# Check cluster status
kubectl exec -n rabbitmq rabbitmq-0 -- rabbitmqctl cluster_status

# List queues
kubectl exec -n rabbitmq rabbitmq-0 -- rabbitmqctl list_queues

# Access the management UI via port-forward
kubectl port-forward -n rabbitmq svc/rabbitmq 15672:15672
# Open http://localhost:15672 in your browser

# Check persistent volume claims
kubectl get pvc -n rabbitmq
```

## Creating Queues and Exchanges Declaratively

You can pre-configure RabbitMQ queues and exchanges using the management API or definitions file.

```yaml
# Snippet: Load definitions on startup via extraConfiguration
extraConfiguration: |
  load_definitions = /app/definitions.json

# Mount a ConfigMap with queue definitions
extraVolumes:
  - name: definitions
    configMap:
      name: rabbitmq-definitions
extraVolumeMounts:
  - name: definitions
    mountPath: /app/definitions.json
    subPath: definitions.json
```

## Summary

Deploying RabbitMQ through a Flux HelmRelease using the Bitnami chart from `oci://registry-1.docker.io/bitnamicharts` provides a GitOps-managed message broker with clustering, persistent storage, a management UI, and Prometheus metrics. The Bitnami chart handles the complex Erlang clustering setup and peer discovery through Kubernetes, making it straightforward to run a highly available RabbitMQ cluster that is fully managed through your Git repository.
