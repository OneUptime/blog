# How to Write CEL Health Check Expressions for Custom Resources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, CEL, Health Check, Custom Resources, Kubernetes, GitOps, Expressions

Description: A comprehensive guide to writing Common Expression Language (CEL) health check expressions for custom Kubernetes resources in Flux CD Kustomizations.

---

## Introduction

Flux CD supports Common Expression Language (CEL) expressions for defining health checks on custom resources. This is essential when deploying custom resource definitions (CRDs) that Flux does not natively understand. CEL health checks allow Flux to determine whether a custom resource has reached a healthy state before proceeding with dependent deployments.

This guide covers the fundamentals of CEL expression syntax and demonstrates how to write health checks for various custom resource types.

## Prerequisites

- Flux CD v2.4+ (CEL health check support)
- A Kubernetes cluster with custom resources deployed
- Basic understanding of Flux Kustomizations

## Understanding CEL in Flux

CEL (Common Expression Language) is a lightweight expression language designed for evaluating conditions. In Flux, CEL expressions are used in the `healthChecks` field of Kustomizations to evaluate the status of custom resources.

### Basic CEL Syntax

CEL expressions in Flux evaluate against the resource object and must return a boolean. The expression has access to the full resource object through the `self` variable.

```yaml
# Basic structure of a CEL health check
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  # ... other fields ...
  healthChecks:
    - apiVersion: myapp.example.com/v1
      kind: MyResource
      name: my-resource
      namespace: default
      # CEL expression that returns true when healthy
      cel:
        expression: >-
          self.status.conditions.exists(c,
            c.type == 'Ready' && c.status == 'True'
          )
```

## CEL Expression Fundamentals

### Accessing Fields

```yaml
# Access top-level status fields
cel:
  expression: "self.status.phase == 'Running'"

# Access nested fields
cel:
  expression: "self.status.deployment.readyReplicas >= 1"

# Access metadata
cel:
  expression: "self.metadata.generation == self.status.observedGeneration"
```

### Working with Conditions

Most Kubernetes resources use the conditions pattern. Here is how to evaluate them:

```yaml
# Check for a specific condition type and status
cel:
  expression: >-
    self.status.conditions.exists(c,
      c.type == 'Ready' && c.status == 'True'
    )

# Check multiple conditions must all be true
cel:
  expression: >-
    self.status.conditions.exists(c,
      c.type == 'Ready' && c.status == 'True'
    ) && self.status.conditions.exists(c,
      c.type == 'Available' && c.status == 'True'
    )

# Ensure no condition is in a failure state
cel:
  expression: >-
    !self.status.conditions.exists(c,
      c.type == 'Failed' && c.status == 'True'
    )
```

### Numeric Comparisons

```yaml
# Check replica counts
cel:
  expression: >-
    self.status.readyReplicas >= self.spec.replicas

# Check percentage-based health
cel:
  expression: >-
    self.status.readyReplicas * 100 / self.spec.replicas >= 80

# Ensure minimum instances
cel:
  expression: >-
    self.status.availableReplicas >= 2
```

### String Operations

```yaml
# Check if status contains a specific substring
cel:
  expression: >-
    self.status.phase.startsWith('Run')

# Check status is one of several accepted values
cel:
  expression: >-
    self.status.phase in ['Running', 'Succeeded', 'Complete']

# Match against a pattern-like check
cel:
  expression: >-
    self.status.message.contains('successfully')
```

## Health Check Patterns for Common CRDs

### Cert-Manager Certificate

```yaml
# clusters/my-cluster/app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-with-certs
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  healthChecks:
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: my-app-tls
      namespace: default
      cel:
        # Certificate is ready when the Ready condition is True
        expression: >-
          self.status.conditions.exists(c,
            c.type == 'Ready' && c.status == 'True'
          )
```

### Istio VirtualService

```yaml
healthChecks:
  - apiVersion: networking.istio.io/v1
    kind: VirtualService
    name: my-app-vs
    namespace: default
    cel:
      # VirtualService is healthy when generation matches
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Reconciled' && c.status == 'True'
        )
```

### Argo Rollout

```yaml
healthChecks:
  - apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: my-app-rollout
    namespace: default
    cel:
      # Rollout is healthy when phase is Healthy and replicas are ready
      expression: >-
        self.status.phase == 'Healthy' &&
        self.status.readyReplicas == self.spec.replicas &&
        self.metadata.generation == self.status.observedGeneration
```

### Crossplane Managed Resource

```yaml
healthChecks:
  - apiVersion: rds.aws.upbound.io/v1beta1
    kind: Instance
    name: my-database
    namespace: default
    cel:
      # Crossplane resource is ready when both Synced and Ready are True
      expression: >-
        self.status.conditions.exists(c,
          c.type == 'Ready' && c.status == 'True'
        ) && self.status.conditions.exists(c,
          c.type == 'Synced' && c.status == 'True'
        )
```

### Knative Service

```yaml
healthChecks:
  - apiVersion: serving.knative.dev/v1
    kind: Service
    name: my-knative-svc
    namespace: default
    cel:
      # Knative service is ready when all three conditions are met
      expression: >-
        self.status.conditions.exists(c,
          c.type == 'Ready' && c.status == 'True'
        ) && self.status.conditions.exists(c,
          c.type == 'ConfigurationsReady' && c.status == 'True'
        ) && self.status.conditions.exists(c,
          c.type == 'RoutesReady' && c.status == 'True'
        )
```

## Advanced CEL Patterns

### Optional Field Handling

Use `has()` to safely check for optional fields:

```yaml
cel:
  expression: >-
    has(self.status) &&
    has(self.status.conditions) &&
    self.status.conditions.size() > 0 &&
    self.status.conditions.exists(c,
      c.type == 'Ready' && c.status == 'True'
    )
```

### Generation Matching with Conditions

Ensure the controller has processed the latest spec:

```yaml
cel:
  expression: >-
    has(self.status.observedGeneration) &&
    self.metadata.generation == self.status.observedGeneration &&
    self.status.conditions.exists(c,
      c.type == 'Ready' && c.status == 'True'
    )
```

### List Operations

Check all items in a list meet criteria:

```yaml
# All endpoints must be healthy
cel:
  expression: >-
    has(self.status.endpoints) &&
    self.status.endpoints.size() > 0 &&
    self.status.endpoints.all(e, e.health == 'Healthy')

# At least one endpoint must be healthy
cel:
  expression: >-
    has(self.status.endpoints) &&
    self.status.endpoints.exists(e, e.health == 'Healthy')
```

### Combining Multiple Health Signals

```yaml
cel:
  expression: >-
    self.metadata.generation == self.status.observedGeneration &&
    !self.status.conditions.exists(c,
      c.type == 'Degraded' && c.status == 'True'
    ) &&
    self.status.conditions.exists(c,
      c.type == 'Available' && c.status == 'True'
    ) &&
    self.status.readyReplicas >= self.spec.replicas
```

## Complete Example: Multi-Resource Kustomization

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: full-app-stack
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/full-stack
  prune: true
  timeout: 15m
  healthChecks:
    # Standard Kubernetes Deployment
    - apiVersion: apps/v1
      kind: Deployment
      name: web-frontend
      namespace: default
    # Custom database resource
    - apiVersion: databases.example.com/v1
      kind: PostgreSQL
      name: app-db
      namespace: default
      cel:
        expression: >-
          self.status.conditions.exists(c,
            c.type == 'Ready' && c.status == 'True'
          ) && self.status.phase == 'Running'
    # Custom cache resource
    - apiVersion: cache.example.com/v1
      kind: RedisCluster
      name: app-cache
      namespace: default
      cel:
        expression: >-
          has(self.status) &&
          self.status.clusterStatus == 'Healthy' &&
          self.status.readyNodes >= self.spec.nodes
    # TLS certificate
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: app-tls
      namespace: default
      cel:
        expression: >-
          self.status.conditions.exists(c,
            c.type == 'Ready' && c.status == 'True'
          )
```

## Debugging CEL Expressions

When a CEL expression does not behave as expected, check these common issues:

### Check the Resource Status

```bash
# View the full status of your custom resource
kubectl get mycrd my-resource -n default -o yaml

# Check if status fields exist
kubectl get mycrd my-resource -n default \
  -o jsonpath='{.status.conditions}'
```

### Common Mistakes

1. Not using `has()` for optional fields, which causes null reference errors
2. Using `==` instead of `exists()` for condition lists
3. Forgetting that condition status values are strings ("True", "False"), not booleans
4. Not checking `observedGeneration` which can cause false positives on stale status

## Best Practices

### Always Check for Field Existence

Use `has()` before accessing fields that might not exist on a newly created resource.

### Match Generation to Observed Generation

This ensures Flux waits for the controller to process the latest version of the spec.

### Keep Expressions Readable

Break complex expressions across multiple lines using YAML multiline strings. Add comments in the Kustomization to explain what each health check validates.

### Test Expressions Against Real Resources

Use `kubectl get` to examine your resource status and verify that your CEL expression matches the actual field paths and values.

## Conclusion

CEL health check expressions give Flux CD the ability to understand the health of any custom resource in your cluster. By writing precise health checks, you ensure that Flux waits for all components to be truly ready before declaring a deployment successful, preventing cascading failures from partially deployed applications.
