# How to Set Up GitOps for Istio with Argo CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Argo CD, GitOps, Kubernetes, Continuous Delivery

Description: Set up Argo CD to manage Istio service mesh configuration through GitOps with automated sync and health checking.

---

Argo CD is one of the most popular GitOps tools for Kubernetes, and it works exceptionally well with Istio. The idea is simple: your Git repository is the single source of truth for all Istio configuration, and Argo CD continuously reconciles your cluster to match what is in Git. No more kubectl apply from laptops, no more wondering who changed what.

This guide sets up Argo CD to manage both Istio installation and day-to-day mesh configuration.

## Installing Argo CD

Deploy Argo CD to your cluster:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait for it to be ready:

```bash
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=argocd-server \
  -n argocd \
  --timeout=300s
```

Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

Install the Argo CD CLI:

```bash
brew install argocd
```

Log in:

```bash
argocd login localhost:8080 --insecure
```

## Repository Structure

Organize your Istio configuration repository for Argo CD:

```text
istio-gitops/
  apps/
    istio-base.yaml
    istiod.yaml
    istio-ingress.yaml
    istio-config.yaml
  istio/
    installation/
      base/
        values.yaml
      istiod/
        values.yaml
      gateway/
        values.yaml
    config/
      base/
        gateway.yaml
        peer-authentication.yaml
        kustomization.yaml
      overlays/
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
    services/
      api-gateway/
        virtualservice.yaml
        destinationrule.yaml
      user-service/
        virtualservice.yaml
        destinationrule.yaml
```

## Creating Argo CD Applications for Istio Installation

Define an Argo CD Application for each Istio component. Start with the base chart:

```yaml
# apps/istio-base.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-base
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: default
  source:
    repoURL: https://istio-release.storage.googleapis.com/charts
    chart: base
    targetRevision: 1.22.0
    helm:
      valuesObject:
        defaultRevision: default
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

Istiod application:

```yaml
# apps/istiod.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istiod
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  project: default
  source:
    repoURL: https://istio-release.storage.googleapis.com/charts
    chart: istiod
    targetRevision: 1.22.0
    helm:
      valueFiles:
        - $values/istio/installation/istiod/values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Ingress gateway:

```yaml
# apps/istio-ingress.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-ingress
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  project: default
  source:
    repoURL: https://istio-release.storage.googleapis.com/charts
    chart: gateway
    targetRevision: 1.22.0
    helm:
      valueFiles:
        - $values/istio/installation/gateway/values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-ingress
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Managing Istio Configuration Resources

Create an application for your mesh configuration (VirtualServices, DestinationRules, etc.):

```yaml
# apps/istio-config.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-config
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/istio-gitops.git
    targetRevision: main
    path: istio/config/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
```

## App of Apps Pattern

Use the App of Apps pattern to manage all Istio applications from a single root application:

```yaml
# app-of-apps.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/istio-gitops.git
    targetRevision: main
    path: apps
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Apply this single resource and Argo CD creates all the child applications:

```bash
kubectl apply -f app-of-apps.yaml
```

## Custom Health Checks for Istio Resources

Argo CD does not know about Istio resource health out of the box. Add custom health checks to the Argo CD ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.networking.istio.io_VirtualService: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "VirtualService is configured"
    return hs

  resource.customizations.health.networking.istio.io_DestinationRule: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "DestinationRule is configured"
    return hs

  resource.customizations.health.networking.istio.io_Gateway: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "Gateway is configured"
    return hs
```

## Sync Waves for Ordered Deployment

Use sync waves to control the order of resource creation. This is critical for Istio because CRDs must exist before custom resources:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # CRDs first
```

The ordering should be:
- Wave 1: istio-base (CRDs)
- Wave 2: istiod (control plane)
- Wave 3: gateways
- Wave 4: mesh configuration (VirtualServices, DestinationRules, etc.)

## Notification on Sync Events

Configure Argo CD notifications to alert you when Istio configuration changes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [slack-message]
  template.slack-message: |
    message: |
      Application {{.app.metadata.name}} has been synced.
      Sync status: {{.app.status.sync.status}}
      Revision: {{.app.status.sync.revision}}
  service.slack: |
    token: $slack-token
    channel: istio-alerts
```

## Monitoring Sync Status

Check the sync status of all Istio applications:

```bash
argocd app list | grep istio
```

Get detailed sync info:

```bash
argocd app get istio-config
```

View the sync history:

```bash
argocd app history istio-config
```

## Rolling Back

If a sync introduces problems, roll back to a previous revision:

```bash
argocd app rollback istio-config <revision-number>
```

Or simply revert the commit in Git and let Argo CD sync the revert automatically.

## Preventing Dangerous Changes

Use Argo CD sync windows to prevent changes during critical periods:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: istio
  namespace: argocd
spec:
  syncWindows:
    - kind: deny
      schedule: "0 0 * * 5"  # No Friday deployments
      duration: 48h
      applications:
        - "*"
```

Argo CD with Istio gives you a complete GitOps pipeline for your service mesh. Every change is tracked in Git, reviewed through pull requests, and automatically applied to the cluster. The self-healing feature means manual changes get reverted, keeping your cluster in sync with your declared configuration. Once you set this up, managing Istio configuration becomes as simple as merging a pull request.
