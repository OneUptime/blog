# How to Use HelmRelease for Deploying MySQL with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, MySQL, HelmRelease, Helm, Database, RDBMS

Description: Learn how to deploy MySQL on Kubernetes using Flux CD HelmRelease with the Bitnami Helm chart for a GitOps-managed relational database.

---

MySQL remains one of the most popular relational databases in the world, powering everything from small applications to large-scale enterprise systems. Running MySQL on Kubernetes with Helm charts simplifies deployment and lifecycle management, and Flux CD adds a GitOps layer that makes your database infrastructure declarative, version-controlled, and automatically reconciled.

This guide shows you how to deploy MySQL on Kubernetes using Flux CD's HelmRelease resource and the Bitnami MySQL Helm chart.

## Prerequisites

Make sure you have the following ready:

- A Kubernetes cluster (v1.26 or later recommended)
- Flux CD installed and bootstrapped on your cluster
- kubectl configured for your cluster
- A Git repository connected to Flux

If Flux is not yet set up:

```bash
# Install the Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Bootstrap Flux with your GitHub repository
flux bootstrap github \
  --owner=your-github-username \
  --repository=your-fleet-repo \
  --branch=main \
  --path=clusters/my-cluster \
  --personal
```

## Setting Up the HelmRepository

Create a HelmRepository resource that points to the Bitnami OCI registry.

Create `mysql-helmrepository.yaml`:

```yaml
# mysql-helmrepository.yaml
# Registers the Bitnami OCI registry as a Helm chart source
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  type: oci
  # Bitnami OCI registry for Helm charts
  url: oci://registry-1.docker.io/bitnamicharts
  interval: 1h  # Poll interval for new versions
```

## Creating the HelmRelease

Define the HelmRelease that tells Flux to deploy MySQL using the Bitnami chart.

Create `mysql-helmrelease.yaml`:

```yaml
# mysql-helmrelease.yaml
# Deploys MySQL using the Bitnami Helm chart via Flux CD
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mysql
  namespace: database
spec:
  interval: 30m  # Reconciliation interval
  chart:
    spec:
      chart: mysql
      version: "12.x"  # Semver version constraint
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 1h
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    # Architecture: standalone or replication
    architecture: standalone

    # Authentication configuration
    auth:
      rootPassword: "change-me-in-production"  # MySQL root password
      database: "appdb"  # Default database to create
      username: "appuser"  # Application database user
      password: "change-me-in-production"  # Application user password

    # Primary instance configuration
    primary:
      persistence:
        enabled: true
        size: 10Gi  # Persistent volume size
      resources:
        requests:
          memory: 256Mi
          cpu: 250m
        limits:
          memory: 512Mi
          cpu: 500m

      # Custom MySQL configuration
      configuration: |-
        [mysqld]
        max_connections=200
        innodb_buffer_pool_size=256M
        character-set-server=utf8mb4
        collation-server=utf8mb4_unicode_ci

    # Metrics exporter for monitoring
    metrics:
      enabled: true
      serviceMonitor:
        enabled: false  # Enable if Prometheus Operator is installed
```

## Deploying MySQL with Replication

For production environments that need read replicas, switch to the replication architecture:

```yaml
# mysql-helmrelease-replication.yaml
# MySQL with primary-secondary replication for high availability
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mysql
  namespace: database
spec:
  interval: 30m
  chart:
    spec:
      chart: mysql
      version: "12.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 1h
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    # Replication architecture with read replicas
    architecture: replication

    auth:
      rootPassword: "change-me-in-production"
      database: "appdb"
      username: "appuser"
      password: "change-me-in-production"
      replicationUser: "replicator"  # Dedicated replication user
      replicationPassword: "change-me-in-production"

    # Primary node settings
    primary:
      persistence:
        enabled: true
        size: 20Gi

    # Secondary (replica) node settings
    secondary:
      replicaCount: 2  # Number of read replicas
      persistence:
        enabled: true
        size: 20Gi
```

## Securing Credentials

Store sensitive values in a Kubernetes Secret rather than in plain text:

```yaml
# mysql-secret.yaml
# Store MySQL credentials in a Kubernetes Secret
apiVersion: v1
kind: Secret
metadata:
  name: mysql-credentials
  namespace: database
type: Opaque
stringData:
  mysql-root-password: "your-secure-root-password"
  mysql-password: "your-secure-app-password"
  mysql-replication-password: "your-secure-replication-password"
```

Reference the secret in the HelmRelease using `valuesFrom`:

```yaml
# Inject secrets into HelmRelease values
valuesFrom:
  - kind: Secret
    name: mysql-credentials
    valuesKey: mysql-root-password
    targetPath: auth.rootPassword
  - kind: Secret
    name: mysql-credentials
    valuesKey: mysql-password
    targetPath: auth.password
  - kind: Secret
    name: mysql-credentials
    valuesKey: mysql-replication-password
    targetPath: auth.replicationPassword
```

## Deploying to Your Cluster

Push your manifests to the Flux-managed Git repository:

```bash
# Commit and push MySQL manifests
git add mysql-helmrepository.yaml mysql-helmrelease.yaml
git commit -m "Add MySQL HelmRelease for Flux CD deployment"
git push origin main
```

Monitor the rollout:

```bash
# Check Helm source status
flux get sources helm

# Check HelmRelease reconciliation
flux get helmreleases -n database

# Watch MySQL pods
kubectl get pods -n database -w
```

## Verifying the Deployment

Once MySQL is running, verify it:

```bash
# Check pod status
kubectl get pods -n database

# Connect to MySQL and run a test query
kubectl run mysql-client --rm -it --restart=Never \
  --namespace database \
  --image=bitnami/mysql:latest \
  --command -- mysql -h mysql -u appuser -p'your-password' appdb \
  -e "SELECT VERSION();"
```

## Connecting Applications

Applications in the same cluster can connect to MySQL using the internal service DNS:

- **Primary (read/write):** `mysql-primary.database.svc.cluster.local:3306`
- **Secondary (read-only):** `mysql-secondary.database.svc.cluster.local:3306` (when using replication)

## Conclusion

Using Flux CD HelmRelease to deploy MySQL on Kubernetes gives you a fully GitOps-managed database. All configuration changes are tracked in Git, enabling easy rollbacks and audit trails. Whether you run a standalone instance for development or a replicated setup for production, this approach keeps your MySQL deployment consistent, reproducible, and automated across environments.
