# How to Implement the Namespace-per-Environment Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Namespaces, Environments

Description: Learn how to implement the namespace-per-environment pattern in ArgoCD where dev, staging, and production run in separate namespaces on a shared cluster.

---

Not every organization needs separate clusters for each environment. If you are running a smaller operation or want to save on infrastructure costs, the namespace-per-environment pattern lets you run development, staging, and production workloads on the same Kubernetes cluster by isolating them into separate namespaces. This guide shows you how to set it up safely with ArgoCD.

## When This Pattern Makes Sense

Use namespace-per-environment when:

- You want to save cost by sharing cluster resources
- Your compliance requirements do not mandate physical separation
- You are running non-production environments for internal development
- You have strong RBAC and network policies in place
- Your workloads are not resource-intensive enough to justify separate clusters

Avoid this pattern when:

- Regulatory requirements demand physical isolation for production
- A noisy neighbor in dev could impact production performance
- You need different Kubernetes versions per environment
- Teams need cluster-admin access in development

## Repository Structure

The structure is similar to cluster-per-environment, but destinations are namespaces rather than clusters:

```
gitops-config/
├── base/
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   └── backend/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── kustomization.yaml
├── overlays/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   └── patches/
│   │       ├── replicas.yaml
│   │       └── resources.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── patches/
│   │       ├── replicas.yaml
│   │       └── resources.yaml
│   └── production/
│       ├── kustomization.yaml
│       └── patches/
│           ├── replicas.yaml
│           ├── resources.yaml
│           └── hpa.yaml
└── cluster-config/
    ├── namespaces.yaml
    ├── network-policies/
    │   ├── dev-netpol.yaml
    │   ├── staging-netpol.yaml
    │   └── production-netpol.yaml
    └── resource-quotas/
        ├── dev-quota.yaml
        ├── staging-quota.yaml
        └── production-quota.yaml
```

## Setting Up Namespaces

First, create the namespaces with proper labels and annotations:

```yaml
# cluster-config/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
  labels:
    env: development
    managed-by: argocd
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    env: staging
    managed-by: argocd
---
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    env: production
    managed-by: argocd
```

## Resource Quotas Per Environment

Protect production by limiting how much dev and staging can consume:

```yaml
# cluster-config/resource-quotas/dev-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "50"
    services: "20"
---
# cluster-config/resource-quotas/production-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "32"
    requests.memory: 64Gi
    limits.cpu: "64"
    limits.memory: 128Gi
    pods: "200"
    services: "50"
```

## Network Policies for Isolation

Prevent cross-namespace traffic to keep environments isolated:

```yaml
# cluster-config/network-policies/production-netpol.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-from-other-namespaces
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    # Allow traffic from within the production namespace
    - from:
        - podSelector: {}
    # Allow traffic from the ingress controller namespace
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
    # Allow traffic from monitoring namespace
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
```

## Kustomize Overlays

Each environment overlay sets the namespace and adjusts resources:

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: dev
resources:
  - ../../base/frontend
  - ../../base/backend
patches:
  - path: patches/replicas.yaml
  - path: patches/resources.yaml
images:
  - name: org/frontend
    newTag: dev-latest
  - name: org/backend
    newTag: dev-latest
```

```yaml
# overlays/dev/patches/replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1
```

```yaml
# overlays/dev/patches/resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  template:
    spec:
      containers:
        - name: frontend
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

Production overlay with larger resources:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base/frontend
  - ../../base/backend
  - patches/hpa.yaml
patches:
  - path: patches/replicas.yaml
  - path: patches/resources.yaml
images:
  - name: org/frontend
    newTag: v1.2.3
  - name: org/backend
    newTag: v2.0.1
```

## ArgoCD Applications

### Manual Applications Per Namespace

```yaml
# apps/dev.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-dev
  namespace: argocd
spec:
  project: development
  source:
    repoURL: https://github.com/org/gitops-config.git
    targetRevision: main
    path: overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
# apps/production.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/org/gitops-config.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      selfHeal: true
      prune: false
```

### ApplicationSet for All Environments

Automate this with an ApplicationSet using a list generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-environments
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            project: development
            autoSync: "true"
            prune: "true"
          - env: staging
            project: staging
            autoSync: "true"
            prune: "true"
          - env: production
            project: production
            autoSync: "true"
            prune: "false"
  template:
    metadata:
      name: 'myapp-{{env}}'
    spec:
      project: '{{project}}'
      source:
        repoURL: https://github.com/org/gitops-config.git
        targetRevision: main
        path: 'overlays/{{env}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{env}}'
      syncPolicy:
        automated:
          selfHeal: true
          prune: '{{prune}}'
        syncOptions:
          - CreateNamespace=true
```

## AppProject Configuration

Each environment gets its own project with restricted permissions:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: development
  namespace: argocd
spec:
  description: Development environment
  sourceRepos:
    - https://github.com/org/gitops-config.git
  destinations:
    - namespace: dev
      server: https://kubernetes.default.svc
  clusterResourceWhitelist: []
  namespaceResourceWhitelist:
    - group: '*'
      kind: '*'
---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production environment
  sourceRepos:
    - https://github.com/org/gitops-config.git
  destinations:
    - namespace: production
      server: https://kubernetes.default.svc
  clusterResourceWhitelist: []
  namespaceResourceWhitelist:
    - group: apps
      kind: Deployment
    - group: ""
      kind: Service
    - group: ""
      kind: ConfigMap
    - group: ""
      kind: Secret
    - group: autoscaling
      kind: HorizontalPodAutoscaler
  syncWindows:
    - kind: allow
      schedule: "0 9 * * 1-5"
      duration: 8h
      applications:
        - "*"
```

## Managing Services That Need Cross-Namespace Access

Sometimes services need to communicate across environments (like a shared database or message queue):

```yaml
# Allow the staging backend to access a shared database in the data namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-staging-to-data
  namespace: data
spec:
  podSelector:
    matchLabels:
      app: postgres
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              env: staging
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - port: 5432
```

## Promotion Workflow

```bash
# Deploy to dev - update the dev overlay
cd overlays/dev
kustomize edit set image org/frontend=org/frontend:abc1234
git add . && git commit -m "Deploy frontend abc1234 to dev"
git push

# After testing, promote to staging
cd overlays/staging
kustomize edit set image org/frontend=org/frontend:abc1234
git add . && git commit -m "Promote frontend abc1234 to staging"
git push

# After QA approval, promote to production
cd overlays/production
kustomize edit set image org/frontend=org/frontend:v1.3.0
git add . && git commit -m "Release frontend v1.3.0 to production"
git push
```

## Monitoring Namespace-Based Environments

```bash
# Check all apps by environment
argocd app list -l env=production

# Compare resource usage across namespaces
kubectl top pods -n dev
kubectl top pods -n staging
kubectl top pods -n production

# Check resource quota usage
kubectl describe resourcequota -n dev
kubectl describe resourcequota -n production
```

The namespace-per-environment pattern is a great starting point for teams that want environment separation without the overhead of multiple clusters. As your needs grow, you can always migrate to the cluster-per-environment pattern later. For more on ArgoCD projects and RBAC, see our guide on [ArgoCD Projects](https://oneuptime.com/blog/post/2026-02-02-argocd-projects/view).
