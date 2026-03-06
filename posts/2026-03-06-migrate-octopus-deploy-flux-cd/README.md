# How to Migrate from Octopus Deploy to Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, octopus deploy, migration, continuous deployment, gitops, kubernetes

Description: A practical guide to migrating Kubernetes deployments from Octopus Deploy to Flux CD with a GitOps-first approach.

---

Octopus Deploy is a mature deployment automation tool that supports Kubernetes alongside traditional deployment targets. Migrating to Flux CD means moving from Octopus's step-based deployment process to a Git-driven, declarative reconciliation model. This guide covers the translation of Octopus Deploy concepts to Flux CD and provides a practical migration path.

## Why Migrate from Octopus Deploy to Flux CD

Octopus Deploy works well for multi-platform deployments but can feel heavyweight for teams that deploy exclusively to Kubernetes. Key reasons to migrate:

- Eliminate the need for Octopus Server or Cloud licensing
- Remove Tentacle agents and their maintenance overhead
- Consolidate deployment configuration into Git
- Gain automatic drift detection and reconciliation
- Simplify Kubernetes-native workflows

## Mapping Octopus Concepts to Flux CD

| Octopus Deploy Concept | Flux CD Equivalent |
|---|---|
| Project | Kustomization or HelmRelease |
| Environment | Cluster path or namespace Kustomization |
| Deployment Process (Steps) | Kustomization dependency chain |
| Channels | Kustomization per release channel |
| Lifecycle | Kustomization dependencies across clusters |
| Variables / Variable Sets | ConfigMaps, Secrets, Kustomize patches |
| Feeds (Docker, Helm) | HelmRepository, ImageRepository |
| Runbooks | Kubernetes Jobs via Kustomization |
| Tenants | Kustomize overlays per tenant |
| Deploy Kubernetes Step | Kustomization or HelmRelease |

## Step 1: Inventory Your Octopus Projects

Document all Octopus projects that deploy to Kubernetes.

```bash
# For each Octopus project, note:
# 1. Project name and group
# 2. Deployment process steps
# 3. Variables and variable sets used
# 4. Kubernetes target clusters and namespaces
# 5. Helm charts or raw YAML used
# 6. Lifecycle (which environments, in what order)
# 7. Any runbook tasks
# 8. Tenant configurations if multi-tenant
```

## Step 2: Export Kubernetes Manifests from Octopus

Extract the Kubernetes manifests that Octopus manages. If you use the "Deploy Kubernetes YAML" step, copy the inline YAML. If you use Helm, note the chart and values.

```yaml
# Example: Octopus "Deploy Kubernetes Containers" step
# translated to a standard Kubernetes Deployment manifest

# apps/web-api/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  labels:
    app: web-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      containers:
        - name: web-api
          image: registry.example.com/web-api:2.1.0
          ports:
            - containerPort: 5000
          env:
            # Variables that were Octopus project variables
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: web-api-secrets
                  key: database-url
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: web-api-config
                  key: log-level
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 30
```

```yaml
# apps/web-api/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-api
spec:
  selector:
    app: web-api
  ports:
    - port: 80
      targetPort: 5000
  type: ClusterIP
```

```yaml
# apps/web-api/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

## Step 3: Translate Octopus Variables to Kustomize Overlays

Octopus variables scoped to environments become Kustomize overlays.

```yaml
# apps/web-api/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
# Staging-specific configuration replacing Octopus staging variables
configMapGenerator:
  - name: web-api-config
    literals:
      - log-level=debug
      - feature-flag-new-ui=true
patchesStrategicMerge:
  - deployment-patch.yaml
```

```yaml
# apps/web-api/overlays/staging/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
spec:
  # Staging uses fewer replicas
  replicas: 1
  template:
    spec:
      containers:
        - name: web-api
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

```yaml
# apps/web-api/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
# Production-specific configuration replacing Octopus production variables
configMapGenerator:
  - name: web-api-config
    literals:
      - log-level=warn
      - feature-flag-new-ui=false
patchesStrategicMerge:
  - deployment-patch.yaml
```

## Step 4: Bootstrap Flux and Create Source Resources

```bash
# Bootstrap Flux in each cluster
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal
```

```yaml
# clusters/production/sources/app-repo.yaml
# If your app manifests live in a separate repo from fleet-infra
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/app-manifests.git
  ref:
    branch: main
  secretRef:
    # Git credentials previously stored in Octopus
    name: git-credentials
```

## Step 5: Create Flux Kustomizations for Each Project

Each Octopus project becomes a Flux Kustomization.

```yaml
# clusters/production/apps/web-api.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-api
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/web-api/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: app-manifests
  # Health checks replacing Octopus deployment verification
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: web-api
      namespace: production
```

## Step 6: Translate Octopus Lifecycles to Dependencies

Octopus lifecycles enforce deployment order across environments. Flux CD uses Kustomization dependencies.

```yaml
# clusters/staging/apps/web-api.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-api
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/web-api/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: app-manifests
  wait: true
  timeout: 10m
```

For enforcing staging-before-production order, use separate branches or paths with manual promotion:

```bash
# Promote from staging to production by updating the production overlay
# This replaces the Octopus lifecycle promotion

# Update the image tag in the production overlay
cd apps/web-api/overlays/production
kustomize edit set image registry.example.com/web-api:2.2.0

git add .
git commit -m "Promote web-api 2.2.0 to production"
git push origin main
```

## Step 7: Migrate Octopus Helm Steps

If Octopus deploys Helm charts, convert to HelmRelease resources.

```yaml
# clusters/production/sources/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: company-charts
  namespace: flux-system
spec:
  # URL from the Octopus Helm feed
  url: https://charts.company.com
  interval: 30m
  secretRef:
    name: helm-repo-credentials
```

```yaml
# clusters/production/releases/backend-api.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: backend-api
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: production
  chart:
    spec:
      chart: backend-api
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: company-charts
  # Values previously configured in Octopus Helm step
  values:
    ingress:
      enabled: true
      host: api.example.com
    database:
      host: db.example.com
    autoscaling:
      enabled: true
      minReplicas: 3
      maxReplicas: 10
  # Octopus Helm upgrade options mapped to Flux
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
```

## Step 8: Replace Octopus Runbooks

Octopus Runbooks for operational tasks become Kubernetes Jobs managed by Flux.

```yaml
# apps/maintenance/db-cleanup/job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-cleanup
  # Use generateName-like behavior with annotations for reruns
  annotations:
    fluxcd.io/description: "Database cleanup job replacing Octopus runbook"
spec:
  template:
    spec:
      containers:
        - name: db-cleanup
          image: registry.example.com/db-tools:1.0.0
          command: ["./cleanup.sh"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
      restartPolicy: Never
  backoffLimit: 3
```

```yaml
# clusters/production/runbooks/db-cleanup.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-cleanup
  namespace: flux-system
spec:
  interval: 24h
  path: ./apps/maintenance/db-cleanup
  prune: true
  sourceRef:
    kind: GitRepository
    name: app-manifests
  # Force apply to rerun the job
  force: true
```

## Step 9: Handle Multi-Tenant Deployments

If you use Octopus Tenants, model them as Kustomize overlays.

```yaml
# apps/saas-app/tenants/acme-corp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: tenant-acme
resources:
  - ../../base
configMapGenerator:
  - name: tenant-config
    literals:
      - tenant-id=acme-corp
      - custom-domain=acme.example.com
      - plan=enterprise
```

```yaml
# clusters/production/apps/tenant-acme.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenant-acme
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/saas-app/tenants/acme-corp
  prune: true
  sourceRef:
    kind: GitRepository
    name: app-manifests
```

## Step 10: Monitoring and Alerts

Replace Octopus deployment notifications with Flux alerts.

```yaml
# clusters/production/notifications/teams-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: teams
  namespace: flux-system
spec:
  type: msteams
  channel: deployments
  secretRef:
    name: teams-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-status
  namespace: flux-system
spec:
  providerRef:
    name: teams
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  # Only alert on specific events
  exclusionList:
    - ".*no change.*"
```

## Summary

Migrating from Octopus Deploy to Flux CD requires mapping Octopus projects to Kustomizations or HelmReleases, translating environment-scoped variables to Kustomize overlays, converting lifecycles to dependency chains, replacing Helm deploy steps with HelmRelease resources, and modeling runbooks as Kubernetes Jobs. Migrate one project at a time, running Octopus and Flux in parallel until each service is verified under Flux management.
