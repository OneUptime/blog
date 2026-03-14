# How to Deploy Microservices with Shared Kustomization in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kustomization, Microservices, Monorepo

Description: Learn how to use a single Kustomization resource to deploy all microservices from a monorepo using Flux CD.

---

## Introduction

Managing multiple microservices in a Kubernetes environment can become complex quickly, especially when they share common configuration or live in the same repository. Flux CD's Kustomization resource provides a powerful mechanism to deploy all microservices together from a single source, reducing operational overhead while maintaining consistency.

A shared Kustomization approach works best when your microservices are closely coupled, share the same release cadence, or when you want atomic deployments where all services update together. This pattern is common in monorepos where a single Git commit contains changes across multiple services.

In this guide you will learn how to configure a single Kustomization resource that reconciles all microservices from a monorepo. You will structure your repository so Flux reads a root kustomization.yaml that references each service directory, and you will verify that Flux reconciles the full stack on every commit.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (`flux bootstrap` completed)
- `kubectl` and `flux` CLI tools installed
- A Git repository containing microservice manifests
- Basic understanding of Kustomize overlay patterns

## Step 1: Structure Your Monorepo

Organize your repository so all microservice manifests live under a common directory that a single kustomization.yaml can reference.

```plaintext
apps/
├── kustomization.yaml        # Root kustomization referencing all services
├── frontend/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── backend-api/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── auth-service/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   └── service.yaml
└── notification-service/
    ├── kustomization.yaml
    ├── deployment.yaml
    └── service.yaml
```

## Step 2: Create the Root kustomization.yaml

Create a root kustomization.yaml that aggregates all microservice directories.

```yaml
# apps/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Reference each microservice directory
resources:
  - frontend/
  - backend-api/
  - auth-service/
  - notification-service/

# Apply common labels to all resources
commonLabels:
  app.kubernetes.io/managed-by: flux
  environment: production

# Apply a common namespace to all resources
namespace: microservices
```

## Step 3: Create Individual Service Kustomizations

Each service directory needs its own kustomization.yaml listing its manifests.

```yaml
# apps/backend-api/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

# Service-specific labels
commonLabels:
  app.kubernetes.io/name: backend-api
  app.kubernetes.io/component: api
```

```yaml
# apps/backend-api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
        - name: backend-api
          image: myregistry/backend-api:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Step 4: Create the Flux GitRepository Source

Define where Flux pulls your manifests from.

```yaml
# clusters/production/sources/monorepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: monorepo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/monorepo
  ref:
    branch: main
  secretRef:
    name: monorepo-credentials
```

## Step 5: Create the Shared Flux Kustomization

Create a single Flux Kustomization that points to the apps directory.

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: all-microservices
  namespace: flux-system
spec:
  interval: 10m
  # Retry on failure with exponential backoff
  retryInterval: 2m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: monorepo
  # Point to the root apps directory
  path: ./apps
  prune: true
  # Wait for all resources to become ready
  wait: true
  # Create the namespace if it does not exist
  targetNamespace: microservices
```

## Step 6: Apply and Verify

Apply the Flux resources and verify all microservices are deployed.

```bash
# Apply the GitRepository and Kustomization
kubectl apply -f clusters/production/sources/monorepo.yaml
kubectl apply -f clusters/production/apps.yaml

# Check the Kustomization status
flux get kustomization all-microservices

# Watch reconciliation events
flux events --for Kustomization/all-microservices

# Verify all pods are running
kubectl get pods -n microservices

# View which resources Flux manages
kubectl get all -n microservices -l app.kubernetes.io/managed-by=flux
```

## Step 7: Trigger a Deployment Update

When you push a change to any microservice, Flux reconciles the entire shared Kustomization.

```bash
# Force immediate reconciliation (skip the interval wait)
flux reconcile kustomization all-microservices --with-source

# Watch the reconciliation progress
flux get kustomization all-microservices --watch

# Describe for detailed status
kubectl describe kustomization all-microservices -n flux-system
```

## Best Practices

- Use `prune: true` to automatically remove resources deleted from Git
- Set `wait: true` to ensure health checks pass before marking reconciliation successful
- Apply `commonLabels` at the root kustomization.yaml to tag all resources uniformly
- Use `targetNamespace` in the Flux Kustomization to keep all services isolated
- Add `retryInterval` to handle transient failures gracefully
- Keep individual service kustomization.yaml files focused on service-specific configuration only

## Conclusion

A shared Kustomization resource in Flux CD simplifies the deployment of multiple microservices from a monorepo by treating them as a single deployable unit. This approach reduces the number of Flux objects you need to manage and ensures all services are always deployed together from the same Git commit. While it sacrifices independent rollout control per service, it is an excellent choice for tightly coupled services or teams that prefer atomic deployments.
