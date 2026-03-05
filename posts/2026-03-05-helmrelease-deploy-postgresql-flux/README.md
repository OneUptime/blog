# How to Use HelmRelease for Deploying PostgreSQL with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, PostgreSQL, HelmRelease, Helm, Database

Description: Learn how to deploy PostgreSQL on Kubernetes using Flux CD HelmRelease with the Bitnami Helm chart for a fully GitOps-managed database.

---

PostgreSQL is one of the most widely used relational databases, known for its reliability, feature set, and strong community support. When running PostgreSQL on Kubernetes, managing deployments through Helm charts is a common approach. Flux CD takes this further by enabling a GitOps workflow where your PostgreSQL deployment is declared in Git and automatically reconciled to your cluster.

In this guide, you will learn how to deploy PostgreSQL on Kubernetes using Flux CD's HelmRelease custom resource along with the Bitnami PostgreSQL Helm chart.

## Prerequisites

Before you begin, make sure you have the following in place:

- A running Kubernetes cluster (v1.26 or later recommended)
- Flux CD installed and bootstrapped on your cluster
- kubectl configured to communicate with your cluster
- A Git repository connected to Flux for storing your manifests

If you have not yet installed Flux, you can bootstrap it with the Flux CLI:

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Bootstrap Flux onto your cluster with your Git repository
flux bootstrap github \
  --owner=your-github-username \
  --repository=your-fleet-repo \
  --branch=main \
  --path=clusters/my-cluster \
  --personal
```

## Setting Up the HelmRepository

The first step is to tell Flux where to find the PostgreSQL Helm chart. Bitnami publishes their charts through an OCI-based registry. You define a HelmRepository resource that points to this registry.

Create a file called `postgresql-helmrepository.yaml`:

```yaml
# postgresql-helmrepository.yaml
# Defines the OCI Helm repository where the Bitnami PostgreSQL chart is hosted
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  type: oci
  # Bitnami OCI registry for Helm charts
  url: oci://registry-1.docker.io/bitnamicharts
  interval: 1h  # How often Flux checks for new chart versions
```

This resource tells Flux to periodically check the Bitnami OCI registry for available chart versions. The `interval` field controls how frequently Flux polls for updates.

## Creating the HelmRelease

Next, define the HelmRelease resource that instructs Flux to install PostgreSQL using the chart from the repository you just defined.

Create a file called `postgresql-helmrelease.yaml`:

```yaml
# postgresql-helmrelease.yaml
# Deploys PostgreSQL using the Bitnami Helm chart via Flux CD
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgresql
  namespace: database  # Target namespace for the PostgreSQL deployment
spec:
  interval: 30m  # Reconciliation interval
  chart:
    spec:
      chart: postgresql
      version: "16.x"  # Use a version constraint to control upgrades
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 1h  # How often to check for new chart versions
  install:
    # Create the target namespace if it does not exist
    createNamespace: true
    remediation:
      retries: 3  # Retry up to 3 times if install fails
  upgrade:
    remediation:
      retries: 3  # Retry up to 3 times if upgrade fails
  values:
    # Configure authentication for PostgreSQL
    auth:
      postgresPassword: "change-me-in-production"  # Superuser password
      username: "appuser"  # Application-level database user
      password: "change-me-in-production"  # Application user password
      database: "appdb"  # Default database to create

    # Configure the primary instance
    primary:
      persistence:
        enabled: true
        size: 10Gi  # Persistent volume size for data storage
      resources:
        requests:
          memory: 256Mi
          cpu: 250m
        limits:
          memory: 512Mi
          cpu: 500m

    # Metrics exporter for Prometheus integration
    metrics:
      enabled: true
      serviceMonitor:
        enabled: false  # Set to true if you have Prometheus Operator installed
```

## Managing Secrets Securely

Storing passwords in plain text inside your Git repository is not recommended. Flux supports integration with sealed-secrets, SOPS, or external secret management tools. Here is how you can reference a Kubernetes Secret instead:

```yaml
# postgresql-secret.yaml
# Store sensitive credentials in a Kubernetes Secret
apiVersion: v1
kind: Secret
metadata:
  name: postgresql-credentials
  namespace: database
type: Opaque
stringData:
  postgres-password: "your-secure-postgres-password"
  password: "your-secure-app-password"
```

Then reference the secret in your HelmRelease values using `valuesFrom`:

```yaml
# Updated HelmRelease snippet showing how to reference external secrets
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgresql
  namespace: database
spec:
  # ... chart spec remains the same ...
  valuesFrom:
    - kind: Secret
      name: postgresql-credentials
      valuesKey: postgres-password
      targetPath: auth.postgresPassword  # Maps secret key to Helm value
    - kind: Secret
      name: postgresql-credentials
      valuesKey: password
      targetPath: auth.password  # Maps secret key to Helm value
```

## Deploying to Your Cluster

Commit all the manifest files to your Flux-connected Git repository:

```bash
# Add the manifests to your Git repository
git add postgresql-helmrepository.yaml postgresql-helmrelease.yaml
git commit -m "Add PostgreSQL HelmRelease for Flux CD deployment"
git push origin main
```

Flux will detect the changes and begin reconciling. You can monitor progress with:

```bash
# Check the status of the HelmRepository
flux get sources helm

# Check the status of the HelmRelease
flux get helmreleases -n database

# Watch the pods come up in the database namespace
kubectl get pods -n database -w
```

## Verifying the Deployment

Once Flux has reconciled the HelmRelease, verify that PostgreSQL is running:

```bash
# Check that the PostgreSQL pod is running
kubectl get pods -n database

# Test connectivity to PostgreSQL
kubectl run pg-client --rm -it --restart=Never \
  --namespace database \
  --image=bitnami/postgresql:latest \
  --command -- psql -h postgresql -U appuser -d appdb -c "SELECT version();"
```

## Handling Upgrades

One of the key benefits of using Flux with HelmRelease is automated upgrades. When a new version of the PostgreSQL chart is published that matches your version constraint (e.g., `16.x`), Flux will automatically detect it and perform the upgrade during the next reconciliation cycle.

To pin a specific version and control upgrades manually, set an exact version:

```yaml
# Pin to a specific chart version for controlled upgrades
chart:
  spec:
    chart: postgresql
    version: "16.4.2"  # Exact version pin
```

## Conclusion

Deploying PostgreSQL with Flux CD and HelmRelease gives you a repeatable, auditable, and automated database deployment workflow. Every change goes through Git, providing a clear history of what was deployed and when. Combined with proper secret management, this approach is well-suited for production Kubernetes environments where consistency and traceability are important.
