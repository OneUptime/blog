# How to Use HelmRelease for Deploying MinIO with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, MinIO, HelmRelease, Helm, Object Storage, S3

Description: Learn how to deploy MinIO on Kubernetes using Flux CD HelmRelease with the official MinIO Helm chart for GitOps-managed S3-compatible object storage.

---

MinIO is a high-performance, S3-compatible object storage system designed for cloud-native workloads. It is widely used for storing unstructured data such as backups, logs, artifacts, and media files. Deploying MinIO on Kubernetes through Flux CD enables a GitOps workflow where your object storage infrastructure is declared in Git and automatically reconciled to your cluster.

This guide covers deploying MinIO on Kubernetes using Flux CD's HelmRelease resource and the official MinIO Helm chart.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.26 or later recommended)
- Flux CD installed and bootstrapped on your cluster
- kubectl configured for your cluster
- A Git repository connected to Flux
- A StorageClass that supports dynamic provisioning

Bootstrap Flux if needed:

```bash
# Install the Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Bootstrap Flux with your repository
flux bootstrap github \
  --owner=your-github-username \
  --repository=your-fleet-repo \
  --branch=main \
  --path=clusters/my-cluster \
  --personal
```

## Setting Up the HelmRepository

The official MinIO Helm chart is published at `https://charts.min.io`. Define a HelmRepository resource pointing to this URL.

Create `minio-helmrepository.yaml`:

```yaml
# minio-helmrepository.yaml
# Registers the official MinIO Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: minio
  namespace: flux-system
spec:
  # Standard HTTPS Helm repository
  url: https://charts.min.io
  interval: 1h  # Check for new chart versions every hour
```

## Creating the HelmRelease

Define the HelmRelease to deploy MinIO using the official chart.

Create `minio-helmrelease.yaml`:

```yaml
# minio-helmrelease.yaml
# Deploys MinIO using the official Helm chart via Flux CD
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: minio
  namespace: minio
spec:
  interval: 30m  # Reconciliation interval
  chart:
    spec:
      chart: minio
      version: "5.x"  # Version constraint for the chart
      sourceRef:
        kind: HelmRepository
        name: minio
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
    # Deployment mode: standalone or distributed
    mode: distributed

    # Number of MinIO server nodes (minimum 4 for distributed mode)
    replicas: 4

    # Root credentials (use secrets in production)
    rootUser: "minio-admin"
    rootPassword: "change-me-in-production"

    # Persistent storage per node
    persistence:
      enabled: true
      size: 100Gi  # Storage per MinIO node

    # Resource allocation
    resources:
      requests:
        memory: 512Mi
        cpu: 250m
      limits:
        memory: 1Gi
        cpu: 500m

    # Console (web UI) configuration
    consoleIngress:
      enabled: false  # Set to true and configure for web UI access

    # API service configuration
    service:
      type: ClusterIP
      port: 9000  # S3 API port

    # Console service
    consoleService:
      type: ClusterIP
      port: 9001  # Console web UI port

    # Default buckets to create on startup
    buckets:
      - name: backups
        policy: none  # none, download, upload, public
        purge: false
      - name: artifacts
        policy: none
        purge: false
      - name: logs
        policy: none
        purge: false

    # Metrics for Prometheus
    metrics:
      serviceMonitor:
        enabled: false  # Enable if Prometheus Operator is installed
```

## Standalone Mode for Development

For development or testing, deploy a single-node MinIO instance:

```yaml
# minio-helmrelease-standalone.yaml
# Minimal single-node MinIO for development
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: minio
  namespace: minio
spec:
  interval: 30m
  chart:
    spec:
      chart: minio
      version: "5.x"
      sourceRef:
        kind: HelmRepository
        name: minio
        namespace: flux-system
      interval: 1h
  install:
    createNamespace: true
  values:
    # Single node mode
    mode: standalone

    rootUser: "minio-admin"
    rootPassword: "change-me-in-production"

    persistence:
      enabled: true
      size: 20Gi

    resources:
      requests:
        memory: 256Mi
        cpu: 100m
      limits:
        memory: 512Mi
        cpu: 250m
```

## Securing Credentials

Store MinIO root credentials in a Kubernetes Secret:

```yaml
# minio-secret.yaml
# Kubernetes Secret for MinIO root credentials
apiVersion: v1
kind: Secret
metadata:
  name: minio-credentials
  namespace: minio
type: Opaque
stringData:
  rootUser: "your-secure-access-key"
  rootPassword: "your-secure-secret-key"
```

Reference the secret in the HelmRelease:

```yaml
# Inject credentials from a Secret into HelmRelease values
valuesFrom:
  - kind: Secret
    name: minio-credentials
    valuesKey: rootUser
    targetPath: rootUser
  - kind: Secret
    name: minio-credentials
    valuesKey: rootPassword
    targetPath: rootPassword
```

## Configuring Bucket Policies and Lifecycle Rules

You can create service accounts and set up lifecycle rules after deployment using the MinIO Client (mc):

```bash
# Port-forward to access MinIO API
kubectl port-forward -n minio svc/minio 9000:9000 &

# Configure mc alias
mc alias set mycluster http://localhost:9000 minio-admin your-password

# List buckets
mc ls mycluster

# Set a lifecycle rule to expire objects after 90 days
mc ilm rule add --expire-days 90 mycluster/logs

# Create a read-only policy for a specific bucket
mc admin policy create mycluster readonly-backups /path/to/policy.json
```

## Deploying to Your Cluster

Commit and push your manifests:

```bash
# Commit MinIO manifests
git add minio-helmrepository.yaml minio-helmrelease.yaml
git commit -m "Add MinIO HelmRelease for Flux CD deployment"
git push origin main
```

Monitor the deployment:

```bash
# Check HelmRelease status
flux get helmreleases -n minio

# Watch MinIO pods
kubectl get pods -n minio -w
```

## Verifying the Deployment

Confirm MinIO is running and accessible:

```bash
# Check pod status
kubectl get pods -n minio

# Port-forward to access the MinIO console
kubectl port-forward -n minio svc/minio-console 9001:9001

# Open http://localhost:9001 in your browser
# Login with rootUser and rootPassword

# Test S3 API connectivity with the MinIO client
mc alias set myminio http://localhost:9000 minio-admin your-password
mc ls myminio
```

## Using MinIO as an S3 Backend

Applications can use MinIO as an S3-compatible backend. The connection details are:

- **Endpoint:** `minio.minio.svc.cluster.local:9000`
- **Access Key:** value of `rootUser`
- **Secret Key:** value of `rootPassword`
- **Region:** leave empty or use `us-east-1`
- **Path Style:** must be enabled (set `s3ForcePathStyle: true`)

## Conclusion

Deploying MinIO with Flux CD and HelmRelease provides a GitOps-managed object storage solution that is S3-compatible and runs entirely within your Kubernetes cluster. Whether you need a simple standalone instance for development or a distributed multi-node setup for production, the official MinIO Helm chart combined with Flux gives you declarative, version-controlled, and automatically reconciled object storage infrastructure. This is particularly valuable for teams that need local S3-compatible storage for backups, artifacts, or application data without depending on cloud provider services.
