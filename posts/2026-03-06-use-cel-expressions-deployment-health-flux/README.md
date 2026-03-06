# How to Use CEL Expressions for Deployment Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, cel, deployments, health checks, kubernetes, gitops, monitoring

Description: A practical guide to using CEL expressions for fine-grained Deployment health checks in Flux CD Kustomizations beyond the default readiness logic.

---

## Introduction

Flux CD has built-in health checks for Kubernetes Deployments, but sometimes you need more control over what constitutes a "healthy" Deployment. CEL (Common Expression Language) expressions let you define custom health criteria such as minimum replica thresholds, specific condition checks, or generation-based validation. This guide shows you how to write CEL expressions tailored to Deployment health checking.

## Prerequisites

- Flux CD v2.4+ with CEL health check support
- A Kubernetes cluster with Deployments managed by Flux
- kubectl access to your cluster

## Why Custom Health Checks for Deployments

The default Flux health check for Deployments waits for the rollout to complete. However, there are scenarios where you need more nuanced checks:

- Requiring a minimum number of ready replicas rather than all replicas
- Checking that the deployment is not in a progressing-but-stuck state
- Validating that specific conditions are met before proceeding
- Ensuring the observed generation matches to avoid stale status

## Understanding Deployment Status Fields

Before writing CEL expressions, you need to understand the status fields available on a Deployment:

```yaml
# Example Deployment status
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
      message: Deployment has minimum availability.
    - type: Progressing
      status: "True"
      reason: NewReplicaSetAvailable
      message: ReplicaSet "my-app-abc123" has successfully progressed.
```

## Basic Deployment Health CEL Expressions

### Standard Readiness Check

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
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
      cel:
        # All replicas must be ready and available
        expression: >-
          self.status.conditions.exists(c,
            c.type == 'Available' && c.status == 'True'
          ) &&
          self.status.readyReplicas == self.spec.replicas
```

### Generation-Aware Health Check

Ensure the Deployment controller has processed the latest spec before declaring it healthy:

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: my-app
    namespace: default
    cel:
      expression: >-
        self.metadata.generation == self.status.observedGeneration &&
        self.status.conditions.exists(c,
          c.type == 'Available' && c.status == 'True'
        ) &&
        self.status.updatedReplicas == self.spec.replicas &&
        self.status.readyReplicas == self.spec.replicas
```

## Advanced Deployment Health Patterns

### Minimum Ready Replicas

For large Deployments, you might not need all replicas ready to consider the deployment healthy:

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: high-availability-app
    namespace: default
    cel:
      # Healthy when at least 80% of replicas are ready
      expression: >-
        has(self.status.readyReplicas) &&
        self.status.readyReplicas * 100 / self.spec.replicas >= 80 &&
        self.status.conditions.exists(c,
          c.type == 'Available' && c.status == 'True'
        )
```

### Detect Stuck Rollouts

A Deployment can appear to be progressing but actually be stuck. Detect this by checking both Progressing and Available conditions:

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: my-app
    namespace: default
    cel:
      # Healthy only when fully rolled out and not stuck progressing
      expression: >-
        self.metadata.generation == self.status.observedGeneration &&
        self.status.conditions.exists(c,
          c.type == 'Available' && c.status == 'True'
        ) &&
        self.status.conditions.exists(c,
          c.type == 'Progressing' &&
          c.status == 'True' &&
          c.reason == 'NewReplicaSetAvailable'
        )
```

### Ensure No Unavailable Replicas

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: critical-app
    namespace: default
    cel:
      # No replicas should be unavailable
      expression: >-
        self.metadata.generation == self.status.observedGeneration &&
        (!has(self.status.unavailableReplicas) ||
         self.status.unavailableReplicas == 0) &&
        self.status.readyReplicas == self.spec.replicas
```

### Minimum Absolute Ready Count

For services that need at least N instances regardless of spec:

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
    namespace: default
    cel:
      # At least 3 replicas must be ready regardless of desired count
      expression: >-
        has(self.status.readyReplicas) &&
        self.status.readyReplicas >= 3 &&
        self.status.conditions.exists(c,
          c.type == 'Available' && c.status == 'True'
        )
```

## Multi-Deployment Health Checks

When your application consists of multiple Deployments, check them all:

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
    # Frontend must have all replicas ready
    - apiVersion: apps/v1
      kind: Deployment
      name: frontend
      namespace: app
      cel:
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          self.status.readyReplicas == self.spec.replicas
    # API can tolerate some unavailability during rollout
    - apiVersion: apps/v1
      kind: Deployment
      name: api-server
      namespace: app
      cel:
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          has(self.status.readyReplicas) &&
          self.status.readyReplicas * 100 / self.spec.replicas >= 75
    # Background worker just needs at least one replica
    - apiVersion: apps/v1
      kind: Deployment
      name: worker
      namespace: app
      cel:
        expression: >-
          has(self.status.readyReplicas) &&
          self.status.readyReplicas >= 1
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

The corresponding CEL health check:

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: my-app
    namespace: default
    cel:
      # Ensure rolling update completed successfully
      expression: >-
        self.metadata.generation == self.status.observedGeneration &&
        self.status.updatedReplicas == self.spec.replicas &&
        self.status.readyReplicas == self.spec.replicas &&
        self.status.conditions.exists(c,
          c.type == 'Progressing' &&
          c.status == 'True' &&
          c.reason == 'NewReplicaSetAvailable'
        )
```

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
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: postgres
      namespace: database
      cel:
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          self.status.readyReplicas == self.spec.replicas
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
      cel:
        expression: >-
          self.metadata.generation == self.status.observedGeneration &&
          self.status.readyReplicas == self.spec.replicas
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

1. **readyReplicas field missing**: When a Deployment has zero ready replicas, the `readyReplicas` field may not exist. Always use `has(self.status.readyReplicas)` before accessing it.

2. **Generation mismatch during rollout**: The observed generation updates after the controller processes the spec, not after the rollout completes. Use it alongside condition checks.

3. **Timeout too short**: Complex Deployments with slow-starting containers may need a longer timeout on the Kustomization.

## Best Practices

### Always Check observed Generation

This prevents false positives where stale status from a previous generation shows as healthy.

### Use has() for Optional Numeric Fields

Fields like `readyReplicas`, `updatedReplicas`, and `unavailableReplicas` are omitted when their value is zero.

### Set Appropriate Timeouts

Match your Kustomization timeout to the expected rollout duration plus a buffer. Account for image pull times, init container execution, and readiness probe delays.

### Combine with Flux Notifications

Set up alerts for health check failures so your team is notified when deployments fail to become healthy.

## Conclusion

CEL expressions give you precise control over what "healthy" means for your Deployments in Flux CD. By going beyond the default health check logic, you can implement percentage-based readiness, stuck rollout detection, and generation-aware validation that matches your application's actual requirements.
