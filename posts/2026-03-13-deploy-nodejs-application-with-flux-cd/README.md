# How to Deploy a Node.js Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Node.js, JavaScript, Deployments

Description: Step-by-step guide to deploying a containerized Node.js application to Kubernetes using Flux CD GitOps, from Dockerfile to automated reconciliation.

---

## Introduction

Node.js applications are among the most commonly deployed workloads on Kubernetes. Whether you are running an Express API, a Fastify microservice, or an NestJS backend, the deployment pattern is consistent: build a container image, push it to a registry, and apply Kubernetes manifests. Doing this manually works for small teams, but it does not scale and introduces the risk of configuration drift between environments.

Flux CD automates this entire lifecycle through GitOps. Your Kubernetes manifests live in a Git repository, and Flux continuously reconciles your cluster against that repository. Every deployment is a Git commit, every rollback is a `git revert`, and every change is auditable through your commit history.

This guide covers containerizing a Node.js Express application, setting up the Flux GitOps pipeline, and configuring automatic image updates so new Docker image tags are deployed without manual intervention.

## Prerequisites

- A running Kubernetes cluster (GKE, EKS, AKS, or local kind/k3s)
- Flux CD bootstrapped on the cluster (`flux bootstrap`)
- A container registry (Docker Hub, GCR, ECR, or GHCR)
- `kubectl`, `flux`, and `docker` CLIs installed
- A Node.js application with a Dockerfile

## Step 1: Containerize the Node.js Application

```dockerfile
# Dockerfile - multi-stage build for minimal production image
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app
# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER appuser
EXPOSE 3000
CMD ["node", "src/index.js"]
```

```bash
# Build and push the image to your registry
docker build -t ghcr.io/your-org/my-node-app:1.0.0 .
docker push ghcr.io/your-org/my-node-app:1.0.0
```

## Step 2: Create the Namespace and Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-node-app
  labels:
    app.kubernetes.io/managed-by: flux
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-node-app
  namespace: my-node-app
  labels:
    app: my-node-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-node-app
  template:
    metadata:
      labels:
        app: my-node-app
    spec:
      containers:
        - name: my-node-app
          image: ghcr.io/your-org/my-node-app:1.0.0  # {"$imagepolicy": "flux-system:my-node-app"}
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "3000"
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-node-app
  namespace: my-node-app
spec:
  selector:
    app: my-node-app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

## Step 3: Create the Flux GitRepository Source

```yaml
# clusters/my-cluster/apps/my-node-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-node-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-node-app
  ref:
    branch: main
  secretRef:
    name: github-token   # Kubernetes secret with GitHub credentials
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/apps/my-node-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-node-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-node-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-node-app
      namespace: my-node-app
```

## Step 5: Configure Automatic Image Updates

```yaml
# clusters/my-cluster/apps/my-node-app/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-node-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-node-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-node-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-node-app
  policy:
    semver:
      range: ">=1.0.0"   # Track all 1.x semantic version releases
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-node-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-node-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update my-node-app image to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters   # Uses the {"$imagepolicy"} marker in deployment.yaml
```

## Step 6: Verify the Deployment

```bash
# Check GitRepository is synced
flux get sources git my-node-app

# Check Kustomization is reconciled
flux get kustomizations my-node-app

# Check image automation
flux get image repository my-node-app
flux get image policy my-node-app

# View pods
kubectl get pods -n my-node-app

# Stream application logs
kubectl logs -n my-node-app -l app=my-node-app -f
```

## Best Practices

- Add health check endpoints (`/health` and `/ready`) to your Node.js app so Kubernetes liveness and readiness probes can accurately determine pod state.
- Use multi-stage Docker builds to keep production images small - avoid copying `devDependencies` or test files.
- Store environment-specific configuration in Kubernetes Secrets or ConfigMaps rather than baking values into the image.
- Use semantic versioning for image tags and the `semver` image policy so Flux only promotes stable releases automatically.
- Set `terminationGracePeriodSeconds` and handle `SIGTERM` in your Node.js app for graceful shutdown during rolling updates.

## Conclusion

Flux CD transforms Node.js deployments from a manual, error-prone process into a fully automated GitOps pipeline. Your application manifests live in Git, Flux ensures the cluster always matches your desired state, and the image automation controller keeps your deployments current with new image releases. From this foundation, you can layer in progressive delivery, multi-environment promotion, and policy enforcement.
