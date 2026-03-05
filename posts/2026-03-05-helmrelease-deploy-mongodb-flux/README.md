# How to Use HelmRelease for Deploying MongoDB with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, MongoDB, HelmRelease, Helm, Database, NoSQL

Description: Learn how to deploy MongoDB on Kubernetes using Flux CD HelmRelease with the Bitnami Helm chart for a GitOps-managed NoSQL database.

---

MongoDB is a leading NoSQL document database used by teams that need flexible schemas, horizontal scaling, and high performance for modern applications. Deploying MongoDB on Kubernetes with Helm charts is a well-established pattern, and Flux CD enhances this by providing a GitOps-driven workflow where every change to your MongoDB deployment is tracked in version control.

This guide covers how to deploy MongoDB on Kubernetes using Flux CD's HelmRelease custom resource and the Bitnami MongoDB Helm chart.

## Prerequisites

Ensure you have the following before starting:

- A Kubernetes cluster (v1.26 or later recommended)
- Flux CD installed and bootstrapped on your cluster
- kubectl configured for your cluster
- A Git repository connected to Flux

Bootstrap Flux if you have not already:

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

Define a HelmRepository pointing to the Bitnami OCI registry where the MongoDB chart is published.

Create `mongodb-helmrepository.yaml`:

```yaml
# mongodb-helmrepository.yaml
# Defines the Bitnami OCI registry as a Helm chart source for Flux
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  type: oci
  # Bitnami OCI registry URL
  url: oci://registry-1.docker.io/bitnamicharts
  interval: 1h  # Check for new chart versions every hour
```

## Creating the HelmRelease for Standalone MongoDB

For development or smaller workloads, a standalone MongoDB instance is often sufficient.

Create `mongodb-helmrelease.yaml`:

```yaml
# mongodb-helmrelease.yaml
# Deploys MongoDB as a standalone instance using the Bitnami chart
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mongodb
  namespace: database
spec:
  interval: 30m  # Reconciliation frequency
  chart:
    spec:
      chart: mongodb
      version: "16.x"  # Semver constraint for chart version
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
    # Standalone architecture (single node)
    architecture: standalone

    # Authentication settings
    auth:
      enabled: true
      rootUser: root
      rootPassword: "change-me-in-production"  # Root password

    # Persistence configuration
    persistence:
      enabled: true
      size: 20Gi  # Storage volume size

    # Resource allocation
    resources:
      requests:
        memory: 256Mi
        cpu: 250m
      limits:
        memory: 512Mi
        cpu: 500m
```

## Creating the HelmRelease for a Replica Set

For production workloads requiring high availability, deploy MongoDB as a replica set:

```yaml
# mongodb-helmrelease-replicaset.yaml
# Deploys MongoDB as a replica set for high availability
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mongodb
  namespace: database
spec:
  interval: 30m
  chart:
    spec:
      chart: mongodb
      version: "16.x"
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
    # Replica set architecture for high availability
    architecture: replicaset

    auth:
      enabled: true
      rootUser: root
      rootPassword: "change-me-in-production"
      replicaSetKey: "change-me-replica-key"  # Shared key for replica set members

    # Number of replica set members
    replicaCount: 3

    persistence:
      enabled: true
      size: 20Gi

    # Arbiter configuration (lightweight member that participates in elections)
    arbiter:
      enabled: true
      resources:
        requests:
          memory: 64Mi
          cpu: 50m
        limits:
          memory: 128Mi
          cpu: 100m
```

## Securing Credentials with Kubernetes Secrets

Avoid committing passwords to Git in plain text. Use a Kubernetes Secret:

```yaml
# mongodb-secret.yaml
# Store MongoDB credentials securely
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-credentials
  namespace: database
type: Opaque
stringData:
  mongodb-root-password: "your-secure-root-password"
  mongodb-replica-set-key: "your-secure-replica-key"
```

Reference the secret in your HelmRelease:

```yaml
# Add valuesFrom to the HelmRelease spec to inject secrets
valuesFrom:
  - kind: Secret
    name: mongodb-credentials
    valuesKey: mongodb-root-password
    targetPath: auth.rootPassword
  - kind: Secret
    name: mongodb-credentials
    valuesKey: mongodb-replica-set-key
    targetPath: auth.replicaSetKey
```

For better security in a GitOps workflow, consider encrypting secrets with SOPS or using Sealed Secrets before committing them to your repository.

## Deploying to Your Cluster

Push your manifests to the Flux-connected Git repository:

```bash
# Commit and push the MongoDB manifests
git add mongodb-helmrepository.yaml mongodb-helmrelease.yaml
git commit -m "Add MongoDB HelmRelease for Flux CD deployment"
git push origin main
```

Monitor the deployment progress:

```bash
# View Helm source status
flux get sources helm

# View HelmRelease reconciliation status
flux get helmreleases -n database

# Watch MongoDB pods
kubectl get pods -n database -w
```

## Verifying the Deployment

Confirm MongoDB is running and accepting connections:

```bash
# Check pod status
kubectl get pods -n database

# Connect to MongoDB and run a test command
kubectl run mongo-client --rm -it --restart=Never \
  --namespace database \
  --image=bitnami/mongodb:latest \
  --command -- mongosh "mongodb://root:your-password@mongodb:27017/admin" \
  --eval "db.runCommand({ ping: 1 })"
```

A successful response will show `{ ok: 1 }`.

## Backup Considerations

For production MongoDB deployments, consider enabling backups. You can add backup configuration through the Helm values:

```yaml
# Add backup configuration to your HelmRelease values
values:
  backup:
    enabled: true
    cronjob:
      schedule: "0 2 * * *"  # Run backups daily at 2 AM
      storage:
        size: 20Gi
```

## Conclusion

Deploying MongoDB with Flux CD and HelmRelease brings the benefits of GitOps to your NoSQL database infrastructure. Whether you choose a standalone instance for development or a replica set for production, every configuration change flows through Git, giving you a complete audit trail and the ability to roll back at any time. Combined with proper secret management and backup strategies, this approach provides a solid foundation for running MongoDB on Kubernetes.
