# How to Implement GitOps for Microservices with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Microservices, DevOps

Description: Learn how to structure and manage microservices deployments with ArgoCD, including repository strategies, ApplicationSets, dependency management, and progressive delivery patterns.

---

Microservices and GitOps are a natural fit. Each service has its own deployment lifecycle, its own configuration, and its own team. ArgoCD gives you the tools to manage dozens or hundreds of microservices declaratively, with full visibility into every service's state across every environment.

This guide covers the patterns that work at scale for managing microservices with ArgoCD.

## Repository Strategy for Microservices

The first decision is how to organize your Git repositories. There are three common patterns:

### Pattern 1: Monorepo (All Config in One Repo)

```
k8s-config/
  apps/
    user-service/
      base/
      overlays/
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

**Pros**: Single place to see everything, easy cross-service changes, simpler CI/CD.
**Cons**: Can get large, harder to restrict access per team.

### Pattern 2: One Repo Per Service

```
user-service-config/       # Separate repo
order-service-config/      # Separate repo
payment-service-config/    # Separate repo
```

**Pros**: Clear ownership, fine-grained access control, independent release cycles.
**Cons**: More repos to manage, harder to see the full picture.

### Pattern 3: One Repo Per Team

```
team-checkout-config/       # order-service, payment-service, cart-service
team-platform-config/       # user-service, auth-service, notification-service
```

**Pros**: Balances ownership with manageability, matches org structure.
**Cons**: Services may need to move between repos as teams change.

For most organizations, **Pattern 3 (one repo per team)** strikes the best balance. It aligns with Conway's Law and gives teams autonomy without creating an explosion of repositories.

## Setting Up AppProjects Per Team

Use ArgoCD AppProjects to enforce boundaries between teams:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-checkout
  namespace: argocd
spec:
  description: Checkout team services
  sourceRepos:
    - "https://github.com/your-org/team-checkout-config.git"
  destinations:
    - namespace: "checkout-*"
      server: https://kubernetes.default.svc
    - namespace: "checkout-*"
      server: https://staging-cluster.example.com
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
  namespaceResourceWhitelist:
    - group: "apps"
      kind: Deployment
    - group: ""
      kind: Service
    - group: ""
      kind: ConfigMap
    - group: ""
      kind: Secret
    - group: "networking.k8s.io"
      kind: Ingress
```

This ensures the checkout team can only deploy to their own namespaces and only create the resource types they need.

## Using ApplicationSets for Microservices

Manually creating an ArgoCD Application for each microservice in each environment gets tedious fast. ApplicationSets automate this:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-checkout-apps
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          # First generator: list of services
          - git:
              repoURL: https://github.com/your-org/team-checkout-config.git
              revision: main
              directories:
                - path: apps/*
          # Second generator: list of environments
          - list:
              elements:
                - env: dev
                  cluster: https://kubernetes.default.svc
                  namespace: checkout-dev
                - env: staging
                  cluster: https://staging-cluster.example.com
                  namespace: checkout-staging
                - env: production
                  cluster: https://production-cluster.example.com
                  namespace: checkout-prod
  template:
    metadata:
      name: "{{path.basename}}-{{env}}"
      labels:
        team: checkout
        env: "{{env}}"
    spec:
      project: team-checkout
      source:
        repoURL: https://github.com/your-org/team-checkout-config.git
        targetRevision: main
        path: "apps/{{path.basename}}/overlays/{{env}}"
      destination:
        server: "{{cluster}}"
        namespace: "{{namespace}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

This single ApplicationSet creates an ArgoCD Application for every service in every environment automatically. Add a new service directory to `apps/` and it gets deployed everywhere.

## Managing Inter-Service Dependencies

Microservices often have deployment ordering requirements. For example, you might need to deploy a database migration before the API service, or an auth service before any service that depends on it.

### Sync Waves for Intra-Application Ordering

```yaml
# Infrastructure resources first (wave -2)
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-config
  annotations:
    argocd.argoproj.io/sync-wave: "-2"

---
# Database migration (wave -1)
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation

---
# Main deployment (wave 0)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  annotations:
    argocd.argoproj.io/sync-wave: "0"

---
# Post-deployment health check (wave 1)
apiVersion: batch/v1
kind: Job
metadata:
  name: health-check
  annotations:
    argocd.argoproj.io/sync-wave: "1"
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
```

### App of Apps for Cross-Service Ordering

For ordering between independent services, use the App of Apps pattern with sync waves:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: auth-service
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # Deploy first
spec:
  project: team-platform
  source:
    repoURL: https://github.com/your-org/team-platform-config.git
    path: apps/auth-service/overlays/production

---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # Deploy after auth-service
spec:
  project: team-platform
  source:
    repoURL: https://github.com/your-org/team-platform-config.git
    path: apps/user-service/overlays/production
```

## Handling Shared Resources

Microservices often share resources like ConfigMaps, Secrets, or custom CRDs. Handle these carefully:

```yaml
# Shared resources as a separate ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shared-infrastructure
  annotations:
    argocd.argoproj.io/sync-wave: "-1"  # Before any service
spec:
  project: platform
  source:
    repoURL: https://github.com/your-org/platform-config.git
    path: shared/production
  destination:
    server: https://kubernetes.default.svc
    namespace: shared
  syncPolicy:
    automated:
      selfHeal: true
      # prune: false - be careful pruning shared resources
```

## Progressive Delivery for Microservices

With Argo Rollouts, you can deploy microservices progressively:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: order-service
spec:
  replicas: 5
  strategy:
    canary:
      canaryService: order-service-canary
      stableService: order-service-stable
      trafficRouting:
        istio:
          virtualService:
            name: order-service-vsvc
            routes:
              - primary
      steps:
        - setWeight: 10
        - pause: {duration: 2m}
        - analysis:
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: order-service
        - setWeight: 30
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 60
        - pause: {duration: 5m}
        - setWeight: 100
```

The analysis template checks real metrics:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status=~"2.."}[5m]))
            /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
```

## Image Update Strategy

For microservices with frequent releases, use ArgoCD Image Updater to automatically update image tags:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service
  annotations:
    argocd-image-updater.argoproj.io/image-list: "main=your-registry/order-service"
    argocd-image-updater.argoproj.io/main.update-strategy: semver
    argocd-image-updater.argoproj.io/main.semver-constraint: ">=1.0.0"
    argocd-image-updater.argoproj.io/write-back-method: git
spec:
  # ... standard Application spec
```

This watches the container registry for new tags matching the semver constraint and updates the Git repo automatically.

## Monitoring Microservices Deployments

With many services, you need good visibility:

```yaml
# Create a dashboard-friendly label structure
metadata:
  labels:
    app.kubernetes.io/name: order-service
    app.kubernetes.io/part-of: checkout-platform
    app.kubernetes.io/managed-by: argocd
    team: checkout
    tier: backend
```

Use these labels to build Grafana dashboards that show deployment status by team, environment, and service tier.

## Conclusion

Managing microservices with ArgoCD scales well when you establish the right patterns early. Use ApplicationSets to avoid repetitive configuration, AppProjects to enforce team boundaries, and sync waves to handle dependencies. The key is finding the right repository structure for your organization - this single decision impacts everything else. Start with your team structure and let the Git organization follow.

For observability across all your microservices, [OneUptime](https://oneuptime.com) provides distributed tracing, metrics, and alerting that complement ArgoCD's deployment management.
