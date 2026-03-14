# How to Deploy WikiJS Documentation with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, WikiJS, Documentation, Knowledge Base

Description: Deploy WikiJS modern wiki platform to Kubernetes using Flux CD for a GitOps-managed, self-hosted documentation and knowledge management system.

---

## Introduction

WikiJS is a modern, fast, and extensible wiki platform built on Node.js. It offers a rich editor experience, granular permission controls, full-text search, and dozens of storage backends—including Git synchronization, which means your wiki content can itself be stored in a Git repository. For engineering teams already invested in GitOps, WikiJS is a natural fit for internal documentation.

Deploying WikiJS on Kubernetes with Flux CD means your wiki infrastructure is declared in Git alongside the applications it documents. The official WikiJS Helm chart supports PostgreSQL, MySQL, and SQLite backends, with Ingress and TLS configuration baked in. Flux watches for changes and reconciles the cluster automatically, so upgrading WikiJS or adjusting its resource limits is a single pull request.

This guide deploys WikiJS with a PostgreSQL database and configures an Ingress endpoint.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- An Ingress controller installed
- Persistent storage available
- `flux` and `kubectl` CLIs configured

## Step 1: Create Namespace and Database Secret

```bash
kubectl create namespace wikijs

# PostgreSQL credentials
kubectl create secret generic wikijs-db-secret \
  --namespace wikijs \
  --from-literal=postgresql-password=wikijsdbpass \
  --from-literal=postgresql-user=wikijs \
  --from-literal=postgresql-database=wikijs
```

## Step 2: Add the WikiJS Helm Repository

```yaml
# clusters/my-cluster/wikijs/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: requarks
  namespace: flux-system
spec:
  url: https://charts.js.wiki
  interval: 12h
```

## Step 3: Deploy PostgreSQL

```yaml
# clusters/my-cluster/wikijs/postgresql-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: wikijs-postgresql
  namespace: wikijs
spec:
  interval: 10m
  chart:
    spec:
      chart: postgresql
      version: ">=13.0.0 <14.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    auth:
      existingSecret: wikijs-db-secret
      secretKeys:
        adminPasswordKey: postgresql-password
        userPasswordKey: postgresql-password
      username: wikijs
      database: wikijs
    primary:
      persistence:
        size: 10Gi
```

## Step 4: Deploy WikiJS

```yaml
# clusters/my-cluster/wikijs/wikijs-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: wikijs
  namespace: wikijs
spec:
  interval: 10m
  dependsOn:
    - name: wikijs-postgresql
  chart:
    spec:
      chart: wiki
      version: ">=2.2.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: requarks
        namespace: flux-system
  values:
    # PostgreSQL connection settings
    postgresql:
      enabled: false   # Use the separately deployed PostgreSQL

    db:
      type: postgres
      host: wikijs-postgresql
      port: 5432
      name: wikijs
      user: wikijs
      # Pull password from the existing secret
      existingSecret: wikijs-db-secret
      existingSecretKey: postgresql-password

    # WikiJS listens on port 3000 by default
    service:
      port: 3000

    ingress:
      enabled: true
      ingressClassName: nginx
      hosts:
        - host: wiki.example.com
          paths:
            - path: /
              pathType: Prefix
      tls:
        - secretName: wikijs-tls
          hosts:
            - wiki.example.com
      annotations:
        nginx.ingress.kubernetes.io/proxy-body-size: "25m"

    # Persistent storage for uploaded assets
    persistence:
      enabled: true
      size: 20Gi

    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: "1"
        memory: 1Gi

    # WikiJS configuration overrides
    config:
      logLevel: info
      offline: false    # Set true for air-gapped clusters
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/wikijs/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: wikijs
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/wikijs
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2beta2
      kind: HelmRelease
      name: wikijs
      namespace: wikijs
```

## Step 6: Complete the Setup Wizard

```bash
# Check Flux reconciliation
flux get helmreleases -n wikijs --watch

# Confirm WikiJS pods are running
kubectl get pods -n wikijs
```

Navigate to `https://wiki.example.com`. WikiJS will display a first-run setup wizard where you configure the admin account and select the storage backend. After setup, log in and create your first documentation page.

## Step 7: Enable Git Storage Sync (Optional)

WikiJS supports synchronizing wiki content to a Git repository. In the Admin panel navigate to **Storage > Git** and configure:

- Repository URL (e.g., `https://gitea.example.com/org/wiki-content.git`)
- Authentication credentials
- Sync direction: bidirectional

This makes your wiki content itself a GitOps artifact.

## Best Practices

- Enable the **Elasticsearch** or **MeiliSearch** module in WikiJS for fast full-text search across large wikis.
- Configure SMTP under **Administration > Mail** so users receive email notifications for page comments and assignments.
- Use WikiJS's built-in **LDAP/SAML** authentication modules to integrate with your existing identity provider.
- Back up the PostgreSQL database regularly—WikiJS stores all page content, revisions, and metadata there.
- Pin the WikiJS chart and image version in `HelmRelease` to prevent unexpected upgrades during peak usage.

## Conclusion

WikiJS is now deployed on Kubernetes and managed through Flux CD. Your team has a modern, self-hosted documentation platform, and your infrastructure team has a fully auditable deployment managed through Git. With the optional Git storage sync enabled, even your wiki content participates in GitOps, creating a fully version-controlled knowledge management system.
