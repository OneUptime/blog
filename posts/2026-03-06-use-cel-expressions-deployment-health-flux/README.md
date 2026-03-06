# How to Use Health Checks for Deployments in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, deployments, health checks, kubernetes, gitops, monitoring

Description: A practical guide to configuring Deployment health checks in Flux CD Kustomizations to validate rollout completion before proceeding with dependent resources.

---

## Introduction

Flux CD has built-in health checks for Kubernetes Deployments that verify rollout completion before marking a Kustomization as ready. By listing Deployments in the `.spec.healthChecks` field of a Kustomization, you ensure that Flux waits for pods to be available before proceeding with dependent resources. You can also use `.spec.wait` to automatically health-check all reconciled resources. This guide shows how to configure Deployment health checks effectively.

## Prerequisites

- Flux CD installed on a Kubernetes cluster
- A Kubernetes cluster with Deployments managed by Flux
- kubectl access to your cluster

## Why Health Checks for Deployments

The default Flux behavior is to apply resources and immediately mark the Kustomization as ready. Without health checks, downstream Kustomizations that depend on this one may start deploying before the Deployment is fully rolled out. Health checks prevent this by waiting for the Deployment rollout to complete.

Common scenarios where Deployment health checks are essential:

- Gating downstream services on backend availability
- Ensuring database migrations only run after the database proxy is ready
- Validating that critical infrastructure components are available before deploying applications

## Understanding Deployment Status Fields

Flux uses the built-in kstatus library to evaluate Deployment health. A Deployment is considered healthy when:

- The observed generation matches the spec generation
- All replicas are updated and available
- No old replicas are pending termination

```yaml
# Example Deployment status when healthy
status:
  observedGeneration: 3
  replicas: 5
  updatedReplicas: 5
  readyReplicas: 5
  availableReplicas: 5
  conditions:
    - type: Available
      status: "True"
      reason: MinimumReplicasAvailable
    - type: Progressing
      status: "True"
      reason: NewReplicaSetAvailable
```

## Basic Deployment Health Checks

### Explicit Health Check for a Single Deployment

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
```

### Wait for All Reconciled Resources

Instead of listing individual resources, you can use `wait: true` to health-check all resources applied by the Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  timeout: 10m
  # Wait for all applied resources to be healthy
  wait: true
```

## Multi-Deployment Health Checks

When your application consists of multiple Deployments, list them all:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: microservices-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/microservices
  prune: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: frontend
      namespace: app
    - apiVersion: apps/v1
      kind: Deployment
      name: api-server
      namespace: app
    - apiVersion: apps/v1
      kind: Deployment
      name: worker
      namespace: app
```

## Combining Health Checks with Rollout Strategies

### Rolling Update with Health Gates

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # Allow at most 1 pod above desired count
      maxSurge: 1
      # Allow at most 1 pod unavailable
      maxUnavailable: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: ghcr.io/myorg/my-app:v1.2.3
          ports:
            - containerPort: 8080
          # Readiness probe must pass before pod is considered ready
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          # Liveness probe restarts unhealthy pods
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

The corresponding Kustomization health check:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
```

Flux will wait until the Deployment rollout completes, meaning all replicas are updated, ready, and available before marking the Kustomization as ready.

## Using Health Checks for Deployment Dependencies

Gate downstream deployments on upstream health:

```yaml
# First deploy the database
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/database
  prune: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: postgres
      namespace: database
---
# Then deploy the application that depends on the database
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: database
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/backend
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: backend
      namespace: app
```

## Debugging Deployment Health Checks

### Inspect Deployment Status

```bash
# Check the current status of a Deployment
kubectl get deployment my-app -n default -o yaml | grep -A 30 "status:"

# Check the Flux Kustomization status for health check results
kubectl get kustomization my-app -n flux-system -o yaml | grep -A 20 "conditions:"
```

### Common Issues

1. **Timeout too short**: Complex Deployments with slow-starting containers may need a longer timeout on the Kustomization. Set `spec.timeout` to account for image pull times, init container execution, and readiness probe delays.

2. **Readiness probes not configured**: Without readiness probes, Kubernetes considers pods ready as soon as the container starts. Ensure your Deployments define meaningful readiness probes.

3. **Insufficient resources**: If pods cannot be scheduled due to resource constraints, the rollout will hang until the health check timeout expires.

## Best Practices

### Set Appropriate Timeouts

Match your Kustomization timeout to the expected rollout duration plus a buffer. Account for image pull times, init container execution, and readiness probe delays.

### Use wait: true for Simple Cases

If all resources in a Kustomization need health checking, use `wait: true` instead of listing each resource individually. This automatically covers any new resources added later.

### Combine with Flux Notifications

Set up alerts for health check failures so your team is notified when deployments fail to become healthy.

### Configure Readiness Probes

Flux health checks for Deployments rely on Kubernetes readiness status. Ensure your Deployments have properly configured readiness probes that reflect actual application readiness.

### Use dependsOn for Ordering

When Deployments depend on other services, split them into separate Kustomizations and use `dependsOn` to enforce deployment order with health gates.

## Conclusion

Flux CD provides built-in health checking for Deployments through the `.spec.healthChecks` field and the `.spec.wait` option. By configuring health checks, you ensure that Flux waits for rollouts to complete before proceeding with dependent resources. Combined with Kubernetes readiness probes and Flux dependency ordering, health checks give you reliable control over deployment sequencing in your GitOps workflow.
