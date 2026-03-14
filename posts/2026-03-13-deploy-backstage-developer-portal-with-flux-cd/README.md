# How to Deploy Backstage Developer Portal with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Backstage, Developer Portal, Platform Engineering

Description: Deploy Backstage internal developer portal to Kubernetes using Flux CD for a GitOps-managed platform engineering hub.

---

## Introduction

Backstage is an open-source platform for building internal developer portals, created by Spotify and now a CNCF incubating project. It centralizes your software catalog, technical documentation, scaffolding templates, and third-party tool integrations into a single developer-facing UI. Platform engineering teams use Backstage to reduce cognitive load on developers by providing a consistent "single pane of glass" for navigating services, APIs, and infrastructure.

Deploying Backstage on Kubernetes with Flux CD means your developer portal infrastructure is managed with the same GitOps discipline that Backstage itself promotes for software development. The official Backstage Helm chart packages the built application, a PostgreSQL database, and all required configuration into a single, declarative release.

This guide deploys Backstage using the official Helm chart with PostgreSQL and GitHub-based authentication.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- A GitHub OAuth App (for authentication) or another identity provider
- An Ingress controller installed
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Secrets

```bash
kubectl create namespace backstage

# GitHub OAuth credentials for authentication
kubectl create secret generic backstage-secrets \
  --namespace backstage \
  --from-literal=GITHUB_TOKEN=ghp_your_token_here \
  --from-literal=AUTH_GITHUB_CLIENT_ID=your_oauth_client_id \
  --from-literal=AUTH_GITHUB_CLIENT_SECRET=your_oauth_client_secret \
  --from-literal=BACKEND_SECRET=$(openssl rand -hex 24) \
  --from-literal=POSTGRES_PASSWORD=backstage_db_pass
```

## Step 2: Add the Backstage Helm Repository

```yaml
# clusters/my-cluster/backstage/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: backstage
  namespace: flux-system
spec:
  url: https://backstage.github.io/charts
  interval: 12h
```

## Step 3: Create the app-config ConfigMap

Backstage reads its runtime configuration from `app-config.yaml`. Store it as a ConfigMap.

```yaml
# clusters/my-cluster/backstage/app-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backstage-app-config
  namespace: backstage
data:
  app-config.production.yaml: |
    app:
      baseUrl: https://backstage.example.com

    backend:
      baseUrl: https://backstage.example.com
      listen:
        port: 7007
      database:
        client: pg
        connection:
          host: backstage-postgresql
          port: 5432
          user: backstage
          database: backstage

    auth:
      environment: production
      providers:
        github:
          production:
            clientId: ${AUTH_GITHUB_CLIENT_ID}
            clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}

    catalog:
      providers:
        github:
          myOrg:
            organization: my-github-org
            catalogPath: /catalog-info.yaml
            filters:
              branch: main
            schedule:
              frequency: { minutes: 30 }
              timeout: { minutes: 3 }

    techdocs:
      builder: external
      generator:
        runIn: docker
      publisher:
        type: local
```

## Step 4: Deploy Backstage via HelmRelease

```yaml
# clusters/my-cluster/backstage/backstage-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: backstage
  namespace: backstage
spec:
  interval: 10m
  chart:
    spec:
      chart: backstage
      version: ">=1.9.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: backstage
        namespace: flux-system
  values:
    backstage:
      image:
        registry: ghcr.io
        repository: my-org/backstage   # Your custom Backstage image
        tag: latest
        pullPolicy: IfNotPresent

      # Mount the app-config ConfigMap
      extraAppConfig:
        - configMapRef: backstage-app-config
          filename: app-config.production.yaml

      # Inject secrets as environment variables
      extraEnvVarsSecrets:
        - backstage-secrets

      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: "1"
          memory: 1Gi

    # Bundled PostgreSQL
    postgresql:
      enabled: true
      auth:
        username: backstage
        database: backstage
        existingSecret: backstage-secrets
        secretKeys:
          adminPasswordKey: POSTGRES_PASSWORD
          userPasswordKey: POSTGRES_PASSWORD
      primary:
        persistence:
          size: 10Gi

    ingress:
      enabled: true
      className: nginx
      host: backstage.example.com
      tls:
        enabled: true
        secretName: backstage-tls
      annotations:
        nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/backstage/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backstage
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/backstage
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: backstage
      namespace: backstage
```

## Step 6: Verify and Register Services

```bash
# Watch Flux reconcile
flux get helmreleases -n backstage --watch

# Check pods
kubectl get pods -n backstage
```

Navigate to `https://backstage.example.com`. Sign in with GitHub. To register a service in the catalog, add a `catalog-info.yaml` to its repository:

```yaml
# catalog-info.yaml (in any service repository)
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  description: My awesome service
  tags:
    - node
spec:
  type: service
  lifecycle: production
  owner: team-platform
```

## Best Practices

- Build a custom Backstage Docker image with your plugins pre-installed rather than using the default image.
- Store `app-config.production.yaml` in Git (without secrets) and inject secrets via the `extraEnvVarsSecrets` mechanism.
- Enable TechDocs to transform Markdown in Git repositories into searchable HTML documentation inside Backstage.
- Use Backstage's scaffolder plugin to create golden-path templates for new services, ensuring teams start with approved patterns.
- Add the Kubernetes plugin to Backstage to show cluster resource status directly on service catalog pages.

## Conclusion

Backstage is now deployed on Kubernetes and managed entirely by Flux CD. Your platform engineering team has a versioned, auditable deployment for the developer portal itself, while developers benefit from a consistent interface to discover services, spin up new projects, and access documentation. Updates to Backstage configuration flow through pull requests, keeping your portal in sync with your organizational needs.
