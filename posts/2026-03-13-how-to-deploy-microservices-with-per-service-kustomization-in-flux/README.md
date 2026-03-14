# How to Deploy Microservices with Per-Service Kustomization in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kustomization, Microservices, Independent Deployment

Description: Learn how to create individual Kustomization resources per microservice in Flux CD for independent deployments and fine-grained rollout control.

---

## Introduction

While a shared Kustomization simplifies management, many teams need independent control over each microservice's deployment lifecycle. Per-service Kustomization resources in Flux CD allow each service to reconcile at its own pace, roll back independently, and be managed by separate teams without coordination overhead.

This pattern is especially valuable in large organizations where different squads own different services. A failure or rollback in one service does not block others, and you can set different sync intervals, health checks, and retry policies per service. It also enables progressive delivery patterns where you validate one service before promoting others.

In this guide you will learn how to create individual Flux Kustomization resources for each microservice in your repository. You will configure per-service sync intervals, target namespaces, and health checks, giving each team precise control over their deployment pipeline.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- A Git repository with microservices organized in separate directories
- Basic familiarity with Flux Kustomization resources

## Step 1: Organize Your Repository

Structure each microservice with its own directory containing a kustomization.yaml.

```plaintext
apps/
├── frontend/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── backend-api/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── auth-service/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── notification-service/
    ├── kustomization.yaml
    ├── deployment.yaml
    └── service.yaml
```

## Step 2: Create the GitRepository Source

Define a single GitRepository source shared by all per-service Kustomizations.

```yaml
# clusters/production/sources/app-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/microservices-repo
  ref:
    branch: main
  secretRef:
    name: app-repo-credentials
```

## Step 3: Create Per-Service Kustomization Resources

Create a separate Flux Kustomization for each microservice. Each can have its own interval, timeout, and health checks.

```yaml
# clusters/production/apps/frontend-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 5m        # Sync every 5 minutes
  retryInterval: 1m
  timeout: 3m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/frontend
  prune: true
  wait: true
  targetNamespace: frontend
  # Health checks specific to the frontend
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: frontend
      namespace: frontend
```

```yaml
# clusters/production/apps/backend-api-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend-api
  namespace: flux-system
spec:
  interval: 5m        # Independent sync interval
  retryInterval: 2m   # Longer retry for backend
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/backend-api
  prune: true
  wait: true
  targetNamespace: backend
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: backend-api
      namespace: backend
```

```yaml
# clusters/production/apps/auth-service-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: auth-service
  namespace: flux-system
spec:
  interval: 10m       # Auth service syncs less frequently
  retryInterval: 2m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/auth-service
  prune: true
  wait: true
  targetNamespace: auth
```

## Step 4: Add Service-Specific Variable Substitution

Each Kustomization can inject service-specific variables using `postBuild`.

```yaml
# clusters/production/apps/notification-service-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: notification-service
  namespace: flux-system
spec:
  interval: 5m
  retryInterval: 1m
  timeout: 3m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/notification-service
  prune: true
  wait: true
  targetNamespace: notifications
  # Inject environment-specific variables
  postBuild:
    substitute:
      SERVICE_NAME: notification-service
      ENVIRONMENT: production
      REPLICA_COUNT: "3"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
        optional: true
      - kind: Secret
        name: notification-secrets
        optional: true
```

## Step 5: Apply All Per-Service Kustomizations

Apply each Kustomization independently.

```bash
# Apply all per-service Kustomization resources
kubectl apply -f clusters/production/apps/

# Check status of each service independently
flux get kustomization frontend
flux get kustomization backend-api
flux get kustomization auth-service
flux get kustomization notification-service

# Get a summary of all Kustomizations
flux get kustomizations
```

## Step 6: Reconcile a Single Service

One of the key advantages of per-service Kustomizations is the ability to reconcile a single service without affecting others.

```bash
# Reconcile only the backend API (does not touch other services)
flux reconcile kustomization backend-api --with-source

# Suspend a single service deployment (e.g., for maintenance)
flux suspend kustomization auth-service

# Resume when maintenance is complete
flux resume kustomization auth-service

# Roll back a service by suspending and reverting the Git change
flux suspend kustomization notification-service
git revert HEAD~1  # Revert the bad commit
git push
flux resume kustomization notification-service
```

## Step 7: Monitor Per-Service Health

```bash
# Watch health of a specific service
flux get kustomization backend-api --watch

# View events for a specific service
flux events --for Kustomization/frontend

# Check which resources each Kustomization manages
kubectl get all -n backend -l \
  kustomize.toolkit.fluxcd.io/name=backend-api

# Describe a failing Kustomization for details
kubectl describe kustomization auth-service -n flux-system
```

## Best Practices

- Use consistent naming: name each Kustomization after its service for easy identification
- Set appropriate sync intervals based on how frequently each service changes
- Use `healthChecks` to define service-specific readiness criteria
- Leverage `dependsOn` to enforce startup ordering when services have hard dependencies
- Group related Flux resources in a dedicated directory per environment (`clusters/production/apps/`)
- Use RBAC to restrict which teams can reconcile which Kustomizations

## Conclusion

Per-service Kustomization resources give each microservice its own deployment lifecycle in Flux CD. Teams can deploy, roll back, suspend, and monitor services independently without coordination. This pattern scales well for large organizations with many services and separate owning teams, providing fine-grained control that a single shared Kustomization cannot offer.
