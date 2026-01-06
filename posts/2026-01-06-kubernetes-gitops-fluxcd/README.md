# How to Automate Kubernetes Deployments with FluxCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GitOps, FluxCD, CI/CD, DevOps, Automation

Description: A comprehensive guide to implementing GitOps with FluxCD, including installation, image automation, Helm releases, multi-tenancy, and production best practices.

---

FluxCD is the CNCF-graduated GitOps toolkit. It continuously reconciles your Kubernetes cluster with Git repositories, automatically deploying changes when you push commits.

## Why FluxCD?

- **CNCF Graduated** - Production-ready, wide adoption
- **Modular** - Use only what you need
- **Native Kubernetes** - Uses CRDs, no external dependencies
- **Multi-tenancy** - Built-in isolation for teams
- **Image Automation** - Auto-update images when new versions are pushed

## Installing FluxCD

### Prerequisites

```bash
# Install flux CLI
# macOS
brew install fluxcd/tap/flux

# Linux
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify
flux --version
flux check --pre
```

### Bootstrap FluxCD

```bash
# Bootstrap with GitHub
export GITHUB_TOKEN=<your-token>
export GITHUB_USER=<your-username>

flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal

# Bootstrap with GitLab
export GITLAB_TOKEN=<your-token>

flux bootstrap gitlab \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production
```

This creates:
1. A Git repository (if it doesn't exist)
2. FluxCD components in your cluster
3. A `GitRepository` and `Kustomization` for self-management

### Verify Installation

```bash
# Check Flux components
flux check

# See all Flux resources
flux get all -A

# Watch reconciliation
flux logs --all-namespaces --follow
```

## Repository Structure

### Recommended Layout

```
fleet-infra/
├── clusters/
│   ├── production/
│   │   ├── flux-system/           # Flux components (auto-generated)
│   │   ├── infrastructure.yaml    # Infrastructure Kustomization
│   │   └── apps.yaml              # Apps Kustomization
│   └── staging/
│       ├── flux-system/
│       ├── infrastructure.yaml
│       └── apps.yaml
├── infrastructure/
│   ├── sources/                   # Helm repos, Git repos
│   │   ├── bitnami.yaml
│   │   └── ingress-nginx.yaml
│   ├── controllers/               # Infrastructure controllers
│   │   ├── ingress-nginx/
│   │   └── cert-manager/
│   └── configs/                   # Cluster configs
│       ├── cluster-issuers/
│       └── network-policies/
└── apps/
    ├── base/
    │   └── myapp/
    │       ├── kustomization.yaml
    │       ├── deployment.yaml
    │       └── service.yaml
    └── production/
        └── myapp/
            ├── kustomization.yaml
            └── patch-replicas.yaml
```

## Core Concepts

### GitRepository

Tells Flux where to find your manifests:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/myapp.git
  ref:
    branch: main
  secretRef:
    name: github-creds  # For private repos
```

### Kustomization

Tells Flux what to apply from a source:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: production
  sourceRef:
    kind: GitRepository
    name: myapp
  path: ./k8s/overlays/production
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: production
  timeout: 3m
```

### HelmRepository

For Helm charts:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
```

### HelmRelease

Deploy Helm charts:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: ingress-nginx
spec:
  interval: 1h
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      replicaCount: 3
      service:
        type: LoadBalancer
```

## Deploying Applications

### Simple Application

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  dependsOn:
    - name: infrastructure
```

### Application with Dependencies

```yaml
# apps/production/myapp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base/myapp
patches:
  - path: patch-replicas.yaml
images:
  - name: myorg/myapp
    newTag: v1.2.3
```

## Image Automation

Automatically update images when new versions are pushed.

### Install Image Automation Controllers

```bash
flux bootstrap github \
  --components-extra=image-reflector-controller,image-automation-controller \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production
```

### Create ImageRepository

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: ghcr.io/myorg/myapp
  interval: 1m
  secretRef:
    name: ghcr-creds
```

### Create ImagePolicy

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  policy:
    semver:
      range: 1.x.x
```

Or for latest tag:

```yaml
spec:
  policy:
    alphabetical:
      order: asc
    filterTags:
      pattern: '^main-[a-f0-9]+-(?P<ts>[0-9]+)'
      extract: '$ts'
```

### Create ImageUpdateAutomation

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux
      messageTemplate: 'Update {{.AutomationObject.Name}}'
    push:
      branch: main
  update:
    path: ./apps/production
    strategy: Setters
```

### Mark Images for Update

```yaml
# In your deployment
spec:
  containers:
    - name: myapp
      image: ghcr.io/myorg/myapp:1.0.0 # {"$imagepolicy": "flux-system:myapp"}
```

Flux will update the image tag and commit to Git.

## Helm with Values from ConfigMaps/Secrets

### Values from ConfigMap

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
spec:
  chart:
    spec:
      chart: myapp
      sourceRef:
        kind: HelmRepository
        name: myorg
  valuesFrom:
    - kind: ConfigMap
      name: myapp-values
      valuesKey: values.yaml
    - kind: Secret
      name: myapp-secrets
      valuesKey: secrets.yaml
```

### Inline Values with Substitution

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
spec:
  postBuild:
    substitute:
      CLUSTER_NAME: production
      DOMAIN: example.com
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
      - kind: Secret
        name: cluster-secrets
```

In your manifests:

```yaml
spec:
  rules:
    - host: myapp.${DOMAIN}
```

## Multi-Tenancy

### Create Tenant Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    toolkit.fluxcd.io/tenant: team-a
```

### Tenant GitRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-a-apps
  namespace: team-a
spec:
  interval: 1m
  url: https://github.com/myorg/team-a-apps.git
  ref:
    branch: main
```

### Tenant Kustomization with Service Account

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a-apps
  namespace: team-a
spec:
  serviceAccountName: team-a-reconciler
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: team-a-apps
  path: ./
  prune: true
  targetNamespace: team-a
```

### RBAC for Tenant

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-a-reconciler
  namespace: team-a
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-reconciler
  namespace: team-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin  # Or custom role
subjects:
  - kind: ServiceAccount
    name: team-a-reconciler
    namespace: team-a
```

## Notifications

### Slack Notifications

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
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
  name: on-call-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
```

### GitHub Commit Status

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: github
  namespace: flux-system
spec:
  type: github
  address: https://github.com/myorg/myapp
  secretRef:
    name: github-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: github-status
  namespace: flux-system
spec:
  providerRef:
    name: github
  eventSources:
    - kind: Kustomization
      name: myapp
```

## Monitoring Flux

### Prometheus Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: flux-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  endpoints:
    - port: http-prom
```

### Grafana Dashboard

Import dashboard ID: `16714` (Flux Cluster Stats)

### Key Metrics

```promql
# Reconciliation errors
gotk_reconcile_condition{type="Ready",status="False"}

# Reconciliation duration
histogram_quantile(0.99, sum(rate(gotk_reconcile_duration_seconds_bucket[5m])) by (le, kind))

# Source fetch failures
gotk_source_condition{type="Ready",status="False"}
```

## Troubleshooting

### Check Status

```bash
# All resources
flux get all -A

# Specific resource
flux get kustomization myapp -n flux-system

# Events
flux events --for Kustomization/myapp

# Logs
flux logs --kind=Kustomization --name=myapp
```

### Force Reconciliation

```bash
# Trigger immediate reconciliation
flux reconcile kustomization myapp -n flux-system

# With source update
flux reconcile source git fleet-infra -n flux-system
```

### Suspend/Resume

```bash
# Stop reconciliation
flux suspend kustomization myapp

# Resume
flux resume kustomization myapp
```

### Common Issues

**Source not ready:**
```bash
flux get sources git -A
kubectl describe gitrepository myapp -n flux-system
```

**Kustomization failed:**
```bash
flux logs --kind=Kustomization --name=myapp --tail=50
```

**Health check timeout:**
```yaml
spec:
  timeout: 5m  # Increase timeout
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: production
```

## Best Practices

1. **Use dependsOn** - Order deployments correctly
2. **Enable pruning** - Remove orphaned resources
3. **Set health checks** - Verify deployments succeed
4. **Use semantic versioning** - For HelmRelease chart versions
5. **Separate infrastructure from apps** - Different reconciliation cycles
6. **Encrypt secrets** - Use SOPS or Sealed Secrets
7. **Monitor reconciliation** - Alert on failures

---

FluxCD provides a robust, CNCF-backed GitOps solution. Its modular design means you can start simple and add capabilities like image automation as you need them. Combined with proper monitoring and alerting, it enables confident, automated deployments from Git.
