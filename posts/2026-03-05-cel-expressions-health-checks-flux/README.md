# How to Use CEL Expressions for Custom Health Checks in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, CEL, Health Checks, Monitoring

Description: Learn how to define custom health checks using CEL expressions in Flux Kustomization resources to verify that your deployed workloads are truly healthy.

---

Flux CD includes built-in health checking for common Kubernetes resource types like Deployments, StatefulSets, and Services. However, when you deploy custom resources (CRDs) or need more nuanced health assessment, the built-in checks may not be sufficient. Flux supports custom health checks using `spec.healthChecks` that allow you to specify which resources to monitor and define readiness criteria. This guide covers how to configure these health checks in your Kustomization resources.

## Built-in Health Checking with wait

Before diving into custom health checks, it is important to understand the default behavior. When you set `spec.wait: true`, Flux uses its built-in health assessment for standard Kubernetes resources.

```yaml
# Basic Kustomization with built-in health checking
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-frontend
  namespace: flux-system
spec:
  interval: 10m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/frontend
  prune: true
  # Enables built-in health checking for all applied resources
  wait: true
```

With `wait: true`, Flux knows how to check the health of Deployments (all replicas ready), StatefulSets (all pods running), Jobs (completed successfully), and other standard resources. The Kustomization is marked as ready only when all applied resources pass their health checks within the `timeout` period.

## Using spec.healthChecks for Custom Resources

When you need to check resources that Flux does not natively understand -- such as custom CRDs from operators -- you can use `spec.healthChecks` to explicitly list the resources to monitor and define how to evaluate their health.

```yaml
# Kustomization with custom health checks for CRDs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database-operator
  namespace: flux-system
spec:
  interval: 10m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/database-operator
  prune: true
  # Custom health checks for resources Flux does not natively assess
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: database-operator-controller
      namespace: database-system
    - apiVersion: databases.example.com/v1
      kind: PostgresCluster
      name: main-db
      namespace: production
```

In this example, Flux will check both the operator Deployment and the custom PostgresCluster resource. For the Deployment, Flux uses its built-in logic. For the custom resource, Flux looks at the resource's `.status.conditions` for a condition of type `Ready` with status `True`.

## How Flux Evaluates Custom Resource Health

By default, when Flux encounters a custom resource in `healthChecks`, it follows a standard convention: it looks for a `Ready` condition in the resource's `.status.conditions` array. Most well-designed Kubernetes operators follow this pattern.

```yaml
# Example: what Flux expects to see on a healthy custom resource
apiVersion: databases.example.com/v1
kind: PostgresCluster
metadata:
  name: main-db
  namespace: production
status:
  conditions:
    - type: Ready
      status: "True"
      lastTransitionTime: "2026-03-05T10:00:00Z"
      reason: ClusterReady
      message: "PostgreSQL cluster is running and accepting connections"
```

If the custom resource has a `Ready` condition with status `True`, Flux considers it healthy. If the condition is `False` or missing, Flux considers it unhealthy and will continue checking until the timeout expires.

## Health Checks with Multiple Resources

A common pattern is deploying an operator alongside its custom resources and checking the health of both.

```yaml
# Full example: operator + custom resources with health checks
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redis-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 2m
  timeout: 15m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/redis
  prune: true
  healthChecks:
    # Check the operator deployment is running
    - apiVersion: apps/v1
      kind: Deployment
      name: redis-operator
      namespace: redis-system
    # Check each Redis cluster instance is ready
    - apiVersion: redis.example.com/v1
      kind: RedisCluster
      name: cache-primary
      namespace: production
    - apiVersion: redis.example.com/v1
      kind: RedisCluster
      name: cache-replica
      namespace: production
    # Check that the Redis Service has endpoints
    - apiVersion: v1
      kind: Service
      name: redis-primary
      namespace: production
```

Flux will wait for all four resources to become healthy before marking the Kustomization as ready. If any one resource fails to become healthy within 15 minutes, the entire Kustomization is marked as failed.

## Separating Operator and Workload Deployments

A best practice is to split operator installation and workload deployment into separate Kustomizations with a dependency chain. This avoids race conditions where custom resources are applied before the CRD is registered.

```yaml
# Step 1: Deploy the operator and its CRDs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redis-operator
  namespace: flux-system
spec:
  interval: 10m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/redis-operator
  prune: true
  wait: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: redis-operator-controller
      namespace: redis-system
---
# Step 2: Deploy custom resources after operator is ready
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: redis-clusters
  namespace: flux-system
spec:
  interval: 10m
  timeout: 15m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/redis-clusters
  prune: true
  # Wait for operator to be fully ready before applying CRs
  dependsOn:
    - name: redis-operator
  healthChecks:
    - apiVersion: redis.example.com/v1
      kind: RedisCluster
      name: cache-primary
      namespace: production
```

This pattern ensures the operator and its CRDs are fully available before Flux attempts to create the custom resources.

## Diagnosing Health Check Failures

When a health check fails, use the Flux CLI to understand what went wrong.

```bash
# Check the Kustomization status for health check details
flux get ks redis-infrastructure --namespace flux-system

# View events to see health check progress and failures
flux events --for Kustomization/redis-infrastructure --namespace flux-system

# Inspect the custom resource status directly
kubectl get rediscluster cache-primary -n production -o yaml
```

Common reasons for health check failures include:

- The custom resource does not use the standard `Ready` condition convention
- The resource takes longer to become ready than the configured `timeout`
- The resource's controller is not running or has errors
- The resource is in a permanent error state (e.g., invalid configuration)

## Combining wait and healthChecks

You can use both `wait: true` and `healthChecks` together. When both are specified, Flux checks the health of all applied resources (via `wait`) and additionally checks the explicitly listed resources in `healthChecks`. This is useful when you want built-in checking for standard resources plus explicit checks for specific custom resources.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: full-stack
  namespace: flux-system
spec:
  interval: 10m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/full-stack
  prune: true
  # Built-in health checks for standard resources
  wait: true
  # Additional explicit health checks for custom resources
  healthChecks:
    - apiVersion: databases.example.com/v1
      kind: PostgresCluster
      name: app-db
      namespace: production
```

## Summary

Custom health checks in Flux Kustomizations give you control over how Flux determines whether your deployments are truly ready. Use `spec.healthChecks` to explicitly list custom resources that Flux should monitor, and ensure those resources follow the standard Kubernetes condition convention with a `Ready` condition. Combined with `dependsOn`, `timeout`, and `retryInterval`, health checks ensure your GitOps pipeline only progresses when each layer of your infrastructure is genuinely operational.
