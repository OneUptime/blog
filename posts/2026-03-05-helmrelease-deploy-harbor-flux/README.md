# How to Use HelmRelease for Deploying Harbor with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Harbor, HelmRelease, Helm, Container Registry, Image Registry

Description: Learn how to deploy Harbor on Kubernetes using Flux CD HelmRelease with the official Harbor Helm chart for a GitOps-managed container registry.

---

Harbor is an open-source container image registry that provides features like vulnerability scanning, image signing, role-based access control, and replication between registries. It is a CNCF graduated project and a popular choice for teams that need a private container registry running within their own infrastructure. Deploying Harbor through Flux CD enables a GitOps workflow where your registry infrastructure is declared in Git and automatically reconciled.

This guide covers deploying Harbor on Kubernetes using Flux CD's HelmRelease resource and the official Harbor Helm chart.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.26 or later recommended)
- Flux CD installed and bootstrapped on your cluster
- kubectl configured for your cluster
- A Git repository connected to Flux
- An Ingress controller installed (Harbor requires Ingress for external access)
- A StorageClass that supports dynamic provisioning

Harbor is a multi-component system that includes a core service, registry, job service, database, Redis, and optional components like Trivy for vulnerability scanning. Plan for adequate resources.

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

The official Harbor Helm chart is published at `https://helm.goharbor.io`. Define a HelmRepository pointing to this URL.

Create `harbor-helmrepository.yaml`:

```yaml
# harbor-helmrepository.yaml
# Registers the official Harbor Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: harbor
  namespace: flux-system
spec:
  # Standard HTTPS Helm repository
  url: https://helm.goharbor.io
  interval: 1h  # Check for new chart versions every hour
```

## Creating the HelmRelease

Define the HelmRelease to deploy Harbor.

Create `harbor-helmrelease.yaml`:

```yaml
# harbor-helmrelease.yaml
# Deploys Harbor using the official Helm chart via Flux CD
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: harbor
  namespace: harbor
spec:
  interval: 30m  # Reconciliation interval
  chart:
    spec:
      chart: harbor
      version: "1.x"  # Version constraint for the chart
      sourceRef:
        kind: HelmRepository
        name: harbor
        namespace: flux-system
      interval: 1h
  install:
    createNamespace: true
    remediation:
      retries: 3
    timeout: 15m  # Harbor has many components and may take time
  upgrade:
    remediation:
      retries: 3
    timeout: 15m
  values:
    # External URL for Harbor (how users will access it)
    externalURL: https://harbor.example.com

    # Expose configuration
    expose:
      type: ingress
      tls:
        enabled: true
        certSource: secret
        secret:
          secretName: harbor-tls
      ingress:
        hosts:
          core: harbor.example.com
        className: nginx
        annotations:
          cert-manager.io/cluster-issuer: "letsencrypt-production"
          # Required for large image pushes
          nginx.ingress.kubernetes.io/proxy-body-size: "0"

    # Harbor admin password
    harborAdminPassword: "change-me-in-production"

    # Internal TLS between Harbor components
    internalTLS:
      enabled: false  # Enable for stricter security

    # Persistence configuration
    persistence:
      enabled: true
      # Registry storage
      persistentVolumeClaim:
        registry:
          size: 100Gi  # Storage for container images
        database:
          size: 5Gi  # Storage for the internal database
        redis:
          size: 2Gi  # Storage for the internal Redis
        jobservice:
          jobLog:
            size: 2Gi
        trivy:
          size: 5Gi  # Storage for vulnerability scan data

    # Internal database (PostgreSQL)
    database:
      type: internal  # Use 'external' for an existing PostgreSQL
      internal:
        resources:
          requests:
            memory: 256Mi
            cpu: 100m

    # Internal Redis
    redis:
      type: internal  # Use 'external' for an existing Redis
      internal:
        resources:
          requests:
            memory: 128Mi
            cpu: 100m

    # Trivy vulnerability scanner
    trivy:
      enabled: true
      resources:
        requests:
          memory: 256Mi
          cpu: 100m
        limits:
          memory: 512Mi
          cpu: 500m

    # Core component resources
    core:
      resources:
        requests:
          memory: 256Mi
          cpu: 100m

    # Registry component resources
    registry:
      resources:
        requests:
          memory: 256Mi
          cpu: 100m
```

## Using External Database and Redis

For production, use external database and Redis instances instead of the bundled ones:

```yaml
# Harbor with external database and Redis
values:
  # Use an external PostgreSQL database
  database:
    type: external
    external:
      host: "postgresql.database.svc.cluster.local"
      port: "5432"
      username: "harbor"
      password: "change-me-in-production"
      coreDatabase: "harbor_core"

  # Use an external Redis instance
  redis:
    type: external
    external:
      addr: "redis-master.cache.svc.cluster.local:6379"
      password: "change-me-in-production"
```

## Securing Credentials

Store Harbor credentials in a Kubernetes Secret:

```yaml
# harbor-secret.yaml
# Kubernetes Secret for Harbor credentials
apiVersion: v1
kind: Secret
metadata:
  name: harbor-credentials
  namespace: harbor
type: Opaque
stringData:
  harbor-admin-password: "your-secure-admin-password"
  database-password: "your-secure-db-password"
```

Reference the secret in the HelmRelease:

```yaml
# Inject secrets into HelmRelease values
valuesFrom:
  - kind: Secret
    name: harbor-credentials
    valuesKey: harbor-admin-password
    targetPath: harborAdminPassword
  - kind: Secret
    name: harbor-credentials
    valuesKey: database-password
    targetPath: database.external.password
```

## Deploying to Your Cluster

Commit and push the manifests:

```bash
# Commit Harbor manifests
git add harbor-helmrepository.yaml harbor-helmrelease.yaml
git commit -m "Add Harbor HelmRelease for Flux CD deployment"
git push origin main
```

Monitor the deployment:

```bash
# Check HelmRelease status
flux get helmreleases -n harbor

# Watch Harbor pods (there are many components)
kubectl get pods -n harbor -w
```

## Verifying the Deployment

Once all components are running, verify Harbor:

```bash
# Check all Harbor pods are ready
kubectl get pods -n harbor

# Test the Harbor API
curl -k https://harbor.example.com/api/v2.0/health

# Login to Harbor with Docker
docker login harbor.example.com -u admin -p your-admin-password

# Push a test image
docker tag nginx:latest harbor.example.com/library/nginx:latest
docker push harbor.example.com/library/nginx:latest
```

## Configuring Image Replication

Harbor supports replicating images between registries. This is useful for multi-cluster setups or for mirroring images from public registries:

```bash
# Access the Harbor web UI at https://harbor.example.com
# Navigate to Administration > Registries to add replication endpoints
# Navigate to Administration > Replications to create replication rules
```

## Conclusion

Deploying Harbor with Flux CD and HelmRelease gives you a GitOps-managed private container registry with enterprise features like vulnerability scanning, RBAC, and image replication. The official Harbor Helm chart handles the complexity of orchestrating multiple components, while Flux ensures your desired state is continuously reconciled from Git. This approach provides a fully self-hosted, auditable, and reproducible container registry that can serve as the foundation for your organization's container image management strategy.
