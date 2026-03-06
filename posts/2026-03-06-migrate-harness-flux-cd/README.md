# How to Migrate from Harness to Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, harness, migration, continuous deployment, gitops, kubernetes

Description: A step-by-step guide to migrating your Kubernetes deployments from Harness CD to Flux CD for a GitOps-native workflow.

---

Harness is a feature-rich CD platform with a visual pipeline builder and built-in verification. Moving to Flux CD means trading that managed experience for a lightweight, Git-native approach where your repository is the single source of truth. This guide covers how to map Harness concepts to Flux CD and execute the migration safely.

## Why Migrate from Harness to Flux CD

There are several reasons teams consider this move:

- Reduce vendor lock-in and licensing costs
- Embrace a fully open-source deployment stack
- Simplify the deployment model by keeping everything in Git
- Gain native Kubernetes integration without external agents
- Avoid managing Harness delegates and connectors

## Mapping Harness Concepts to Flux CD

Understanding the conceptual mapping helps plan the migration.

| Harness Concept | Flux CD Equivalent |
|---|---|
| Service | Kustomization or HelmRelease |
| Environment | Kustomization per cluster/namespace |
| Infrastructure Definition | GitRepository + cluster bootstrap |
| Workflow / Pipeline | Kustomization dependency chain |
| Artifact Source | ImageRepository + ImagePolicy |
| Connectors (Git, Docker) | GitRepository, HelmRepository, ImageRepository |
| Triggers | GitRepository polling / Webhook Receiver |
| Approval Steps | Flux suspend + manual resume |
| Verification | Health checks + Flagger |
| Secrets (Harness Secret Manager) | SOPS / Sealed Secrets |

## Step 1: Audit Your Harness Setup

Before migrating, document all services, environments, and pipelines in Harness.

```bash
# List all the services you need to migrate
# Document for each service:
# 1. Deployment type (Kubernetes, Helm, Kustomize)
# 2. Artifact source (Docker registry, ECR, GCR, etc.)
# 3. Environment variables and secrets
# 4. Pre/post deployment steps
# 5. Approval gates
# 6. Verification steps

# Export your Harness service manifests if using Kubernetes deployments
# These will form the basis of your Flux manifests
```

## Step 2: Set Up the Git Repository Structure

Create a repository structure that mirrors your Harness environments.

```bash
# Repository structure
fleet-infra/
  clusters/
    staging/
      flux-system/        # Flux bootstrap resources
      sources/            # Git and Helm repositories
      apps/               # Application Kustomizations
      releases/           # HelmReleases
      image-automation/   # Image update policies
    production/
      flux-system/
      sources/
      apps/
      releases/
      image-automation/
  apps/
    my-service/
      base/               # Base manifests
        deployment.yaml
        service.yaml
        kustomization.yaml
      overlays/
        staging/          # Staging-specific patches
          kustomization.yaml
        production/       # Production-specific patches
          kustomization.yaml
```

## Step 3: Bootstrap Flux CD

Install Flux in each cluster that Harness currently deploys to.

```bash
# Bootstrap Flux for the staging cluster
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/staging \
  --personal

# Switch context and bootstrap production
kubectl config use-context production-cluster
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal
```

## Step 4: Migrate Harness Kubernetes Services

A Harness Kubernetes service typically consists of deployment manifests and a values override. Convert these to Flux Kustomizations.

```yaml
# apps/my-service/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  labels:
    app: my-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: my-service
          # Image that was previously managed by Harness artifact source
          image: registry.example.com/my-service:1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: host
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

```yaml
# apps/my-service/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

```yaml
# apps/my-service/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - replica-patch.yaml
  - resource-patch.yaml
```

```yaml
# apps/my-service/overlays/production/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  # Production needs more replicas than staging
  replicas: 5
```

## Step 5: Migrate Harness Helm Services

If your Harness service uses Helm charts, convert to HelmRelease resources.

```yaml
# clusters/production/sources/bitnami.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  # Harness connector URL mapped to Flux HelmRepository
  url: https://charts.bitnami.com/bitnami
  interval: 30m
```

```yaml
# clusters/production/releases/redis.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: cache
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
  # Values that were configured in Harness service overrides
  values:
    architecture: replication
    replica:
      replicaCount: 3
    auth:
      existingSecret: redis-password
    master:
      persistence:
        size: 10Gi
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
```

## Step 6: Replace Harness Triggers with Flux Automation

Harness triggers that deploy on new artifact versions can be replaced with Flux Image Automation.

```yaml
# clusters/production/image-automation/my-service.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-service
  namespace: flux-system
spec:
  # The same registry URL from your Harness artifact source
  image: registry.example.com/my-service
  interval: 1m
  secretRef:
    # Registry credentials previously stored in Harness connectors
    name: registry-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-service
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-service
  # Filter tags by semver, matching Harness artifact filter behavior
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxbot
        email: flux@example.com
      messageTemplate: "chore: update {{range .Changed.Changes}}{{.OldValue}} to {{.NewValue}}{{end}}"
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Step 7: Replace Harness Approval Steps

Harness pipelines often have approval gates between environments. In Flux CD, you can achieve this with suspended Kustomizations.

```yaml
# clusters/production/apps/my-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-service
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-service/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Suspend the Kustomization to require manual approval
  suspend: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-service
      namespace: production
```

```bash
# When ready to deploy (replacing the Harness approval click),
# resume the Kustomization
flux resume kustomization my-service

# After deployment, suspend again for next approval cycle
flux suspend kustomization my-service
```

## Step 8: Replace Harness Verification with Flagger

Harness includes deployment verification with metrics analysis. Flux CD integrates with Flagger for canary analysis.

```yaml
# clusters/production/releases/flagger.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: flagger
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: flagger-system
  chart:
    spec:
      chart: flagger
      sourceRef:
        kind: HelmRepository
        name: flagger
  install:
    createNamespace: true
---
# Canary resource for progressive delivery verification
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-service
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  progressDeadlineSeconds: 600
  service:
    port: 8080
  analysis:
    # Analysis configuration replacing Harness verification steps
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

## Step 9: Migrate Secrets

Move secrets from Harness Secret Manager to SOPS-encrypted secrets in Git.

```yaml
# clusters/production/secrets/db-credentials.yaml
# This file gets encrypted with SOPS before committing
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
stringData:
  host: db.example.com
  username: app_user
  password: super-secret-password
```

```bash
# Encrypt the secret file before committing
sops --encrypt --in-place clusters/production/secrets/db-credentials.yaml

# The encrypted file is safe to store in Git
git add clusters/production/secrets/db-credentials.yaml
git commit -m "Add encrypted database credentials"
```

## Step 10: Parallel Operation and Cutover

Run Harness and Flux CD in parallel, migrating services one at a time.

```yaml
# clusters/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Phase 1: Internal services (low risk)
  - apps/internal-api.yaml
  - apps/worker.yaml

  # Phase 2: External services (higher risk, migrate after confidence)
  # - apps/public-api.yaml
  # - apps/web-frontend.yaml
```

```bash
# Monitor Flux reconciliation during parallel operation
flux get kustomizations --watch

# Compare deployed versions between Harness and Flux
kubectl get deployments -n production -o wide

# Once verified, disable the corresponding Harness pipeline
# and uncomment the next batch of services
```

## Notification Setup

Replace Harness notification rules with Flux notification controller:

```yaml
# clusters/production/notifications/provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-notifications
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: all-resources
  namespace: flux-system
spec:
  providerRef:
    name: slack-notifications
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Summary

Migrating from Harness to Flux CD involves replacing Harness services with Kustomization or HelmRelease resources, connectors with Flux source resources, triggers with image automation, approval gates with suspended reconciliations, and verification steps with Flagger canary analysis. Migrate incrementally, running both systems in parallel, and cut over one service at a time after verifying Flux reconciliation is working correctly.
