# How to Integrate Istio with Argo CD for GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Argo CD, GitOps, Kubernetes, Deployments

Description: How to manage Istio resources with Argo CD using a GitOps workflow for consistent and auditable mesh configuration.

---

GitOps is the practice of using Git as the single source of truth for your infrastructure and application configuration. Argo CD is one of the most popular GitOps tools for Kubernetes, and it works great with Istio. Instead of manually applying Istio resources with kubectl, you define everything in a Git repository and Argo CD keeps your cluster in sync.

## Why GitOps for Istio

Istio configuration can get complicated fast. You have VirtualServices, DestinationRules, Gateways, AuthorizationPolicies, PeerAuthentication resources, and more. When multiple team members are making changes directly with kubectl, it becomes hard to track who changed what and when. GitOps solves this by making every change go through a pull request with review and audit trail.

## Installing Argo CD

If you do not have Argo CD installed yet:

```bash
kubectl create namespace argocd

kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Install the CLI:

```bash
brew install argocd
```

Get the initial admin password:

```bash
argocd admin initial-password -n argocd
```

Access the UI:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Log in:

```bash
argocd login localhost:8080
```

## Repository Structure

Organize your Git repository so Istio resources are clearly separated. A good structure looks like this:

```text
├── base/
│   ├── istio/
│   │   ├── gateway.yaml
│   │   ├── peer-authentication.yaml
│   │   └── authorization-policies/
│   │       ├── default-deny.yaml
│   │       └── allow-ingress.yaml
│   └── apps/
│       ├── frontend/
│       │   ├── deployment.yaml
│       │   ├── service.yaml
│       │   ├── virtual-service.yaml
│       │   └── destination-rule.yaml
│       └── backend/
│           ├── deployment.yaml
│           ├── service.yaml
│           ├── virtual-service.yaml
│           └── destination-rule.yaml
├── overlays/
│   ├── staging/
│   │   └── kustomization.yaml
│   └── production/
│       └── kustomization.yaml
```

## Teaching Argo CD About Istio CRDs

Argo CD needs to understand Istio's Custom Resource Definitions to track their health properly. By default, Argo CD might show Istio resources as "Unknown" health status. Add custom health checks in the Argo CD ConfigMap:

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
    hs.message = "VirtualService is healthy"
    return hs
  resource.customizations.health.networking.istio.io_DestinationRule: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "DestinationRule is healthy"
    return hs
  resource.customizations.health.networking.istio.io_Gateway: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "Gateway is healthy"
    return hs
  resource.customizations.health.security.istio.io_AuthorizationPolicy: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "AuthorizationPolicy is healthy"
    return hs
  resource.customizations.health.security.istio.io_PeerAuthentication: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "PeerAuthentication is healthy"
    return hs
```

## Creating an Argo CD Application for Istio

Create an Application resource that points to your Git repo:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-config
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-config.git
    targetRevision: main
    path: base/istio
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

The `selfHeal: true` option is especially important for Istio. If someone manually changes a VirtualService with kubectl, Argo CD will detect the drift and revert it to match what is in Git.

## Managing Istio Installation with Argo CD

You can also manage the Istio installation itself through Argo CD. Using the IstioOperator resource:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-control-plane
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-config.git
    targetRevision: main
    path: base/istio-operator
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
    - ServerSideApply=true
```

The `ServerSideApply` option is helpful for large Istio resources that can exceed the annotation size limit used by client-side apply.

Your IstioOperator manifest in Git:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
  namespace: istio-system
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 10
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
```

## Using Kustomize for Environment-Specific Config

Different environments often need different Istio settings. Use Kustomize overlays:

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base/apps/frontend

patches:
- target:
    kind: VirtualService
    name: frontend
  patch: |
    - op: replace
      path: /spec/http/0/retries/attempts
      value: 5
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base/apps/frontend

patches:
- target:
    kind: VirtualService
    name: frontend
  patch: |
    - op: replace
      path: /spec/http/0/retries/attempts
      value: 3
    - op: add
      path: /spec/http/0/fault
      value: {}
```

Create separate Argo CD Applications for each environment:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-config.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Sync Waves for Ordered Deployment

Istio resources often need to be applied in a specific order. For example, the Gateway should exist before the VirtualService that references it. Use Argo CD sync waves:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  # ...
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: frontend
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  # ...
```

## Drift Detection

Argo CD continuously compares the live cluster state with the desired state in Git. If someone changes an Istio resource manually:

```bash
# Check for drift
argocd app diff istio-config

# View the app status
argocd app get istio-config
```

With `selfHeal: true`, Argo CD automatically reverts manual changes. This keeps your mesh configuration consistent and auditable.

Managing Istio through Argo CD gives you a solid operational foundation. Every change is reviewed in a pull request, automatically applied, and continuously monitored for drift. When something breaks, you can trace it back to a specific commit and revert it. That level of traceability is worth the initial setup effort.
