# How to Deploy Multiple Microservices with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Microservices

Description: Learn how to deploy and manage multiple microservices with ArgoCD using app-of-apps pattern, ApplicationSets, and monorepo strategies for scalable GitOps workflows.

---

Managing multiple microservices with ArgoCD requires a strategy that goes beyond creating individual Application resources by hand. When you have 5, 10, or 50 microservices, you need patterns that scale - both for the initial deployment and for ongoing management. This guide covers the most effective approaches to handling multi-service deployments with ArgoCD.

## The Challenge

In a microservices architecture, each service typically has its own:
- Kubernetes Deployment, Service, and Ingress
- ConfigMaps and Secrets
- HPA or scaling configuration
- Possibly its own database or message queue

Managing each service as a standalone ArgoCD Application quickly becomes tedious. You need automation.

## Repository Strategies

Before writing any ArgoCD configuration, decide on your repository layout.

### Monorepo Approach

All services live in a single repository:

```
microservices/
  services/
    user-service/
      base/
        deployment.yaml
        service.yaml
        kustomization.yaml
      overlays/
        staging/
        production/
    order-service/
      base/
      overlays/
    payment-service/
      base/
      overlays/
    notification-service/
      base/
      overlays/
```

### Polyrepo Approach

Each service has its own repository, with a separate config repo for deployment manifests:

```
# deployment-config repo
environments/
  staging/
    user-service/
    order-service/
    payment-service/
  production/
    user-service/
    order-service/
    payment-service/
```

Both approaches work with ArgoCD. Monorepos are simpler to manage. Polyrepos give teams more autonomy.

## Strategy 1: App-of-Apps Pattern

The app-of-apps pattern uses a parent ArgoCD Application that manages child Application resources stored in Git.

### Parent Application

```yaml
# apps/root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: microservices-root
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/microservices.git
    targetRevision: main
    path: argocd-apps  # Directory containing child Application YAMLs
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Child Application Definitions

Create an Application resource for each microservice:

```yaml
# argocd-apps/user-service.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: microservices
  source:
    repoURL: https://github.com/myorg/microservices.git
    targetRevision: main
    path: services/user-service/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: microservices
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
# argocd-apps/order-service.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: microservices
  source:
    repoURL: https://github.com/myorg/microservices.git
    targetRevision: main
    path: services/order-service/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: microservices
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

When you deploy the root app, ArgoCD creates all child applications automatically. Adding a new service means adding a new YAML file to the `argocd-apps/` directory.

For a deeper dive into this pattern, check out [How to Build ArgoCD App of Apps Pattern](https://oneuptime.com/blog/post/2026-01-30-argocd-app-of-apps-pattern/view).

## Strategy 2: ApplicationSets with Git Generator

ApplicationSets automate the creation of Applications based on templates and generators. The Git generator is perfect for monorepos.

```yaml
# applicationset.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/microservices.git
        revision: main
        directories:
          # Each subdirectory under services/ becomes an Application
          - path: services/*/overlays/production
  template:
    metadata:
      # Extract the service name from the path
      name: '{{path[1]}}'
      namespace: argocd
    spec:
      project: microservices
      source:
        repoURL: https://github.com/myorg/microservices.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: microservices
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

With this configuration, ArgoCD automatically discovers every service directory and creates an Application for it. When you add a new service directory to the repo, a new Application appears automatically - no manual intervention needed.

## Strategy 3: ApplicationSets with List Generator

When you need explicit control over each service's configuration, the list generator works well:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - service: user-service
            replicas: "3"
            memory: "512Mi"
          - service: order-service
            replicas: "5"
            memory: "1Gi"
          - service: payment-service
            replicas: "3"
            memory: "768Mi"
          - service: notification-service
            replicas: "2"
            memory: "256Mi"
  template:
    metadata:
      name: '{{service}}'
      namespace: argocd
    spec:
      project: microservices
      source:
        repoURL: https://github.com/myorg/microservices.git
        targetRevision: main
        path: 'services/{{service}}/overlays/production'
        kustomize:
          patches:
            - target:
                kind: Deployment
              patch: |
                - op: replace
                  path: /spec/replicas
                  value: {{replicas}}
      destination:
        server: https://kubernetes.default.svc
        namespace: microservices
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Shared Infrastructure

Most microservice deployments need shared infrastructure - message queues, databases, monitoring tools. Create a separate Application for shared resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shared-infrastructure
  namespace: argocd
spec:
  project: microservices
  source:
    repoURL: https://github.com/myorg/microservices.git
    targetRevision: main
    path: infrastructure
  destination:
    server: https://kubernetes.default.svc
    namespace: microservices
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Use sync waves to ensure shared infrastructure deploys before the services that depend on it:

```yaml
# In shared infrastructure manifests
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"  # Deploy before services

# In service manifests
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # Deploy after infrastructure
```

## ArgoCD Project for Isolation

Create an ArgoCD Project to scope permissions for your microservices:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: microservices
  namespace: argocd
spec:
  description: Microservices platform
  sourceRepos:
    - https://github.com/myorg/microservices.git
  destinations:
    - server: https://kubernetes.default.svc
      namespace: microservices
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
```

## Monitoring the Fleet

With many microservices, you need visibility. Use the ArgoCD CLI to get a quick overview:

```bash
# List all applications and their status
argocd app list -p microservices

# Check for any unhealthy or out-of-sync apps
argocd app list -p microservices --output json | \
  jq '.[] | select(.status.health.status != "Healthy" or .status.sync.status != "Synced")'
```

The ArgoCD UI provides a dashboard view showing all applications at once, with color-coded health and sync statuses.

## Rolling Out Changes Across Services

When you need to update a shared dependency across all services (like a base image or a common library), update it in Git and let ArgoCD propagate the change:

```bash
# Update the base image across all services
# Edit each service's kustomization.yaml or use a script
for svc in user-service order-service payment-service notification-service; do
  # Update image tag in each service overlay
  cd services/$svc/overlays/production
  kustomize edit set image base-image=myregistry.io/base:v2.0.0
  cd -
done

git commit -am "Update base image to v2.0.0 across all services"
git push
```

## Key Takeaways

For managing multiple microservices with ArgoCD:

1. **Start with app-of-apps** if you have fewer than 10 services and want explicit control
2. **Use ApplicationSets** when you have many services that follow similar patterns
3. **Use ArgoCD Projects** to isolate permissions between teams
4. **Deploy shared infrastructure separately** with sync waves for ordering
5. **Keep your repository structure consistent** - inconsistency across service directories will break ApplicationSet generators

The combination of ApplicationSets and Kustomize overlays gives you a scalable GitOps platform that handles dozens or even hundreds of microservices without manual Application management.
