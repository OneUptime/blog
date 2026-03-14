# How to Deploy Frontend and Backend Services Together in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kustomization, Frontend, Backend, Full-Stack Deployment

Description: Learn how to coordinate frontend and backend deployment as a unit using Flux CD Kustomizations with proper dependency ordering and shared configuration.

---

## Introduction

Full-stack applications require both frontend and backend services to work in concert. When you deploy a new API version that introduces breaking changes, the frontend must be updated simultaneously — or the frontend must gracefully handle version mismatches. Coordinating these deployments manually is error-prone; Flux CD provides a GitOps-native way to deploy both together while ensuring the backend is healthy before the frontend is exposed to users.

The key challenge in full-stack deployment is timing: the backend API must be ready to serve requests before the frontend starts directing user traffic to it. A new frontend that hits an old or unavailable backend creates a broken user experience. Flux's `dependsOn` field solves this by making the frontend Kustomization dependent on the backend, so Flux waits for backend readiness before deploying the frontend.

In this guide you will structure a Git repository with frontend and backend directories, create Flux Kustomizations with proper dependency ordering, and configure shared environment variables that both services read from a common ConfigMap.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- Separate Docker images for your frontend (e.g., React, Vue, Angular) and backend (e.g., Node.js, Go, Python)
- Basic understanding of Kubernetes Deployments and Services

## Step 1: Structure the Repository

Organize your frontend and backend under a shared apps directory.

```
apps/
├── shared/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   └── shared-config.yaml        # ConfigMap with shared settings
├── backend/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
└── frontend/
    ├── kustomization.yaml
    ├── deployment.yaml
    ├── service.yaml
    └── ingress.yaml
```

## Step 2: Create Shared Configuration

Store shared configuration that both frontend and backend need.

```yaml
# apps/shared/shared-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-app-config
  namespace: app
data:
  # Backend reads this to configure CORS allowed origins
  FRONTEND_URL: "https://app.myorg.com"
  # Frontend reads this to know where the API lives
  REACT_APP_API_URL: "https://api.myorg.com"
  # Shared environment
  ENVIRONMENT: "production"
  LOG_LEVEL: "info"
  # Feature flags shared between frontend and backend
  FEATURE_NEW_DASHBOARD: "true"
  FEATURE_BETA_CHECKOUT: "false"
```

## Step 3: Create the Backend Deployment

```yaml
# apps/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        version: v2.5.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      containers:
        - name: backend
          image: myregistry/backend:v2.5.0
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 9090
              name: metrics
          envFrom:
            # Load shared config into environment
            - configMapRef:
                name: shared-app-config
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: backend-secrets
                  key: database-url
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
```

## Step 4: Create the Frontend Deployment

```yaml
# apps/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        version: v3.1.0
    spec:
      containers:
        - name: frontend
          image: myregistry/frontend:v3.1.0
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            # Frontend also loads shared config
            - configMapRef:
                name: shared-app-config
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

## Step 5: Create Flux Kustomization Resources

Define the Flux Kustomizations with the frontend depending on the backend.

```yaml
# clusters/production/apps/shared-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-shared
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/shared
  prune: true
  wait: true
---
# clusters/production/apps/backend-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/backend
  prune: true
  wait: true
  # Backend depends on shared config being applied first
  dependsOn:
    - name: app-shared
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: backend
      namespace: app
---
# clusters/production/apps/frontend-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/frontend
  prune: true
  wait: true
  # Frontend only deploys after backend is healthy
  dependsOn:
    - name: backend
    - name: app-shared
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: frontend
      namespace: app
```

## Step 6: Coordinate a Full-Stack Release

When you need to release both frontend and backend changes together, commit both in one Git push.

```bash
# Push both frontend and backend changes in one commit
git add apps/backend/deployment.yaml apps/frontend/deployment.yaml
git commit -m "release: v2.5.0 backend + v3.1.0 frontend"
git push

# Flux detects the change and reconciles in order:
# 1. app-shared (no deps)
# 2. backend (depends on app-shared)
# 3. frontend (depends on backend)

# Monitor the full-stack reconciliation
flux get kustomizations --watch

# Verify both are deployed
kubectl get pods -n app -l app=backend
kubectl get pods -n app -l app=frontend
```

## Step 7: Roll Back a Full-Stack Release

```bash
# If the release is bad, revert the commit in Git
git revert HEAD
git push

# Flux will reconcile both services back to the previous state
# The frontend rolls back only after the backend rolls back
flux get kustomizations --watch

# Or suspend and manually rollback
flux suspend kustomization frontend
flux suspend kustomization backend
kubectl rollout undo deployment/frontend -n app
kubectl rollout undo deployment/backend -n app
flux resume kustomization backend
flux resume kustomization frontend
```

## Best Practices

- Use a shared ConfigMap for settings that must be consistent between frontend and backend
- Always deploy the frontend with `dependsOn` pointing to the backend
- Build frontend Docker images with runtime environment variable support (not compile-time) so the same image works across environments
- Use the same Git tag in both the frontend and backend Docker image references for versioned releases
- Consider using Flux image automation to keep image tags in sync across both services
- Run integration tests in a staging environment after both services deploy before promoting to production

## Conclusion

Deploying frontend and backend services together with Flux CD combines the simplicity of a single Git push with the safety of ordered, health-checked reconciliation. By declaring the frontend's dependency on the backend in Flux Kustomization resources and sharing configuration through a common ConfigMap, you ensure your full-stack application deploys correctly every time. When either layer needs a rollback, Flux handles the ordering in reverse, keeping your deployment always in a consistent state.
