# How to Use HelmRelease for Deploying Redis with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Redis, HelmRelease, Helm, Caching

Description: Learn how to deploy Redis on Kubernetes using Flux CD HelmRelease with the Bitnami Helm chart for a GitOps-managed in-memory data store.

---

Redis is a popular in-memory data store used for caching, session management, message brokering, and real-time analytics. Running Redis on Kubernetes is straightforward with Helm charts, and Flux CD makes it even better by introducing a GitOps workflow where your Redis deployment is version-controlled and automatically reconciled.

This guide walks you through deploying Redis on Kubernetes using Flux CD's HelmRelease resource and the Bitnami Redis Helm chart.

## Prerequisites

Before getting started, ensure the following are in place:

- A Kubernetes cluster (v1.26 or later recommended)
- Flux CD installed and bootstrapped on your cluster
- kubectl configured to talk to your cluster
- A Git repository connected to Flux for storing manifests

If Flux is not yet installed, bootstrap it with:

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Bootstrap Flux with your Git repository
flux bootstrap github \
  --owner=your-github-username \
  --repository=your-fleet-repo \
  --branch=main \
  --path=clusters/my-cluster \
  --personal
```

## Setting Up the HelmRepository

Define a HelmRepository resource pointing to the Bitnami OCI registry where the Redis chart is published.

Create a file called `redis-helmrepository.yaml`:

```yaml
# redis-helmrepository.yaml
# Points Flux to the Bitnami OCI registry for Helm charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  type: oci
  # Bitnami OCI Helm chart registry
  url: oci://registry-1.docker.io/bitnamicharts
  interval: 1h  # Frequency for checking new chart versions
```

If you already have a Bitnami HelmRepository defined in your cluster from another deployment, you can reuse it. Each HelmRepository name must be unique within its namespace.

## Creating the HelmRelease

Now define the HelmRelease resource that tells Flux to deploy Redis using the Bitnami chart.

Create a file called `redis-helmrelease.yaml`:

```yaml
# redis-helmrelease.yaml
# Deploys Redis using the Bitnami Helm chart through Flux CD
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: cache  # Target namespace for Redis
spec:
  interval: 30m  # How often Flux reconciles this release
  chart:
    spec:
      chart: redis
      version: "20.x"  # Version constraint for the chart
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 1h  # How often to check for chart updates
  install:
    createNamespace: true  # Create the namespace if it does not exist
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    # Architecture: standalone or replication
    architecture: replication  # Deploy Redis with replicas for high availability

    # Authentication configuration
    auth:
      enabled: true
      password: "change-me-in-production"  # Redis password

    # Master node configuration
    master:
      persistence:
        enabled: true
        size: 8Gi  # Storage for the master node
      resources:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 250m

    # Replica configuration
    replica:
      replicaCount: 2  # Number of read replicas
      persistence:
        enabled: true
        size: 8Gi  # Storage per replica
      resources:
        requests:
          memory: 128Mi
          cpu: 100m
        limits:
          memory: 256Mi
          cpu: 250m

    # Metrics exporter for monitoring
    metrics:
      enabled: true
      serviceMonitor:
        enabled: false  # Enable if Prometheus Operator is installed
```

## Standalone Configuration

If you do not need replication and want a simpler setup, use standalone architecture:

```yaml
# Simplified Redis HelmRelease for standalone mode
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: cache
spec:
  interval: 30m
  chart:
    spec:
      chart: redis
      version: "20.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  install:
    createNamespace: true
  values:
    # Standalone mode: single Redis instance with no replicas
    architecture: standalone

    auth:
      enabled: true
      password: "change-me-in-production"

    master:
      persistence:
        enabled: true
        size: 8Gi
```

## Securing the Redis Password

Rather than storing the password in plain text, use a Kubernetes Secret and reference it with `valuesFrom`:

```yaml
# redis-secret.yaml
# Kubernetes Secret for Redis authentication
apiVersion: v1
kind: Secret
metadata:
  name: redis-credentials
  namespace: cache
type: Opaque
stringData:
  redis-password: "your-secure-redis-password"
```

Reference the secret in your HelmRelease:

```yaml
# Add this to your HelmRelease spec
valuesFrom:
  - kind: Secret
    name: redis-credentials
    valuesKey: redis-password
    targetPath: auth.password  # Maps the secret value to the Helm chart value
```

## Deploying to Your Cluster

Commit the manifests and push them to your Flux-connected repository:

```bash
# Stage and commit the Redis manifests
git add redis-helmrepository.yaml redis-helmrelease.yaml
git commit -m "Add Redis HelmRelease for Flux CD deployment"
git push origin main
```

Monitor the deployment:

```bash
# Check HelmRepository status
flux get sources helm

# Check HelmRelease status
flux get helmreleases -n cache

# Watch pods in the cache namespace
kubectl get pods -n cache -w
```

## Verifying the Deployment

Once Redis is running, verify connectivity:

```bash
# List the Redis pods
kubectl get pods -n cache

# Connect to Redis and test with a ping command
kubectl run redis-client --rm -it --restart=Never \
  --namespace cache \
  --image=bitnami/redis:latest \
  --command -- redis-cli -h redis-master -a "your-redis-password" PING
```

You should see `PONG` returned, confirming Redis is accepting connections.

## Connecting Applications to Redis

Applications running in the same cluster can connect to Redis using the service DNS name. The Bitnami chart creates services with predictable names:

- **Master (read/write):** `redis-master.cache.svc.cluster.local:6379`
- **Replicas (read-only):** `redis-replicas.cache.svc.cluster.local:6379`

## Handling Upgrades

Flux will automatically upgrade Redis when new chart versions matching your constraint become available. To control this process more tightly, you can pin to an exact version and update it manually through a Git commit:

```yaml
# Pin to exact version for controlled upgrades
chart:
  spec:
    chart: redis
    version: "20.6.1"  # Exact version pin
```

## Conclusion

Deploying Redis with Flux CD and HelmRelease provides a clean GitOps workflow for managing your caching infrastructure. Every configuration change is tracked in Git, making rollbacks straightforward and deployments reproducible. Whether you need a simple standalone instance or a replicated setup for high availability, the Bitnami Redis chart combined with Flux gives you the flexibility and automation to run Redis confidently on Kubernetes.
