# How to Use HelmRelease for Deploying Keycloak with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Keycloak, HelmRelease, Helm, Identity, Authentication, IAM

Description: Learn how to deploy Keycloak on Kubernetes using Flux CD HelmRelease with the Bitnami Helm chart for GitOps-managed identity and access management.

---

Keycloak is an open-source identity and access management solution that provides single sign-on, user federation, identity brokering, and social login capabilities. It supports standard protocols like OpenID Connect, OAuth 2.0, and SAML 2.0. Deploying Keycloak on Kubernetes through Flux CD gives you a GitOps-managed authentication platform where configuration changes are tracked in Git and automatically applied.

This guide walks through deploying Keycloak on Kubernetes using Flux CD's HelmRelease resource and the Bitnami Keycloak Helm chart.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.26 or later recommended)
- Flux CD installed and bootstrapped on your cluster
- kubectl configured for your cluster
- A Git repository connected to Flux
- A PostgreSQL database (Keycloak requires a database backend; the Bitnami chart can provision one)

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

Define a HelmRepository pointing to the Bitnami OCI registry where the Keycloak chart is published.

Create `keycloak-helmrepository.yaml`:

```yaml
# keycloak-helmrepository.yaml
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
  interval: 1h  # Check for new chart versions every hour
```

## Creating the HelmRelease

Define the HelmRelease that instructs Flux to deploy Keycloak.

Create `keycloak-helmrelease.yaml`:

```yaml
# keycloak-helmrelease.yaml
# Deploys Keycloak using the Bitnami Helm chart via Flux CD
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: keycloak
  namespace: keycloak
spec:
  interval: 30m  # Reconciliation interval
  chart:
    spec:
      chart: keycloak
      version: "24.x"  # Semver constraint for the chart version
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 1h
  install:
    createNamespace: true
    remediation:
      retries: 3
    timeout: 10m  # Keycloak can take time to initialize
  upgrade:
    remediation:
      retries: 3
    timeout: 10m
  values:
    # Keycloak admin credentials
    auth:
      adminUser: admin  # Admin username for the Keycloak console
      adminPassword: "change-me-in-production"  # Admin password

    # Number of Keycloak replicas
    replicaCount: 2

    # Resource allocation
    resources:
      requests:
        memory: 512Mi
        cpu: 500m
      limits:
        memory: 1Gi
        cpu: 1000m

    # Production mode enables stricter security defaults
    production: true

    # Proxy configuration (needed when running behind a load balancer)
    proxy: edge  # edge, reencrypt, or passthrough

    # PostgreSQL database configuration (bundled with the chart)
    postgresql:
      enabled: true  # Deploy a PostgreSQL instance alongside Keycloak
      auth:
        postgresPassword: "change-me-in-production"
        username: keycloak
        password: "change-me-in-production"
        database: keycloak
      primary:
        persistence:
          enabled: true
          size: 10Gi

    # Ingress configuration
    ingress:
      enabled: true
      ingressClassName: nginx
      hostname: keycloak.example.com
      tls: true
      annotations:
        cert-manager.io/cluster-issuer: "letsencrypt-production"
```

## Using an External Database

For production, you may want to use an external PostgreSQL database instead of the bundled one:

```yaml
# Keycloak with an external database
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: keycloak
  namespace: keycloak
spec:
  interval: 30m
  chart:
    spec:
      chart: keycloak
      version: "24.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 1h
  install:
    createNamespace: true
    timeout: 10m
  values:
    auth:
      adminUser: admin
      adminPassword: "change-me-in-production"

    replicaCount: 2
    production: true
    proxy: edge

    # Disable the bundled PostgreSQL
    postgresql:
      enabled: false

    # Configure the external database connection
    externalDatabase:
      host: "postgresql.database.svc.cluster.local"
      port: 5432
      user: keycloak
      password: "change-me-in-production"
      database: keycloak
```

## Securing Credentials

Store sensitive values in a Kubernetes Secret:

```yaml
# keycloak-secret.yaml
# Kubernetes Secret for Keycloak credentials
apiVersion: v1
kind: Secret
metadata:
  name: keycloak-credentials
  namespace: keycloak
type: Opaque
stringData:
  admin-password: "your-secure-admin-password"
  db-password: "your-secure-database-password"
  postgres-password: "your-secure-postgres-password"
```

Reference the secret in the HelmRelease:

```yaml
# Inject secrets into HelmRelease values
valuesFrom:
  - kind: Secret
    name: keycloak-credentials
    valuesKey: admin-password
    targetPath: auth.adminPassword
  - kind: Secret
    name: keycloak-credentials
    valuesKey: db-password
    targetPath: postgresql.auth.password
  - kind: Secret
    name: keycloak-credentials
    valuesKey: postgres-password
    targetPath: postgresql.auth.postgresPassword
```

## Deploying to Your Cluster

Commit and push the manifests:

```bash
# Commit Keycloak manifests
git add keycloak-helmrepository.yaml keycloak-helmrelease.yaml
git commit -m "Add Keycloak HelmRelease for Flux CD deployment"
git push origin main
```

Monitor the deployment:

```bash
# Check HelmRelease status
flux get helmreleases -n keycloak

# Watch Keycloak pods
kubectl get pods -n keycloak -w
```

## Verifying the Deployment

Once Keycloak is running, verify access:

```bash
# Check pod status
kubectl get pods -n keycloak

# Port-forward to access Keycloak locally
kubectl port-forward -n keycloak svc/keycloak 8080:80

# Open http://localhost:8080 in your browser
# Login with the admin username and password
```

If you configured an Ingress, access Keycloak at the hostname you specified (e.g., `https://keycloak.example.com`).

## Configuring Realms and Clients

After deployment, you can configure Keycloak realms and clients through the admin console or by importing realm configuration files. For a GitOps approach, you can use Keycloak's realm import feature:

```yaml
# Add to HelmRelease values for realm import
values:
  keycloakConfigCli:
    enabled: true
    configuration:
      myrealm.json: |
        {
          "realm": "myrealm",
          "enabled": true,
          "sslRequired": "external",
          "registrationAllowed": false,
          "clients": [
            {
              "clientId": "my-app",
              "enabled": true,
              "publicClient": true,
              "redirectUris": ["https://myapp.example.com/*"]
            }
          ]
        }
```

## Conclusion

Deploying Keycloak with Flux CD and HelmRelease provides a GitOps-managed identity and access management platform. The Bitnami chart handles the complexity of setting up Keycloak with its database backend, ingress configuration, and production-mode defaults. Every change to your Keycloak deployment flows through Git, giving you an auditable and reproducible authentication infrastructure that is well-suited for production Kubernetes environments.
