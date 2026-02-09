# How to Configure Admission Policy Priority and Ordering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Admission Control, Policy Ordering, Webhooks, Architecture

Description: Learn how to configure admission policy priority and execution ordering, manage dependencies between mutating and validating webhooks, optimize policy performance, and avoid conflicts in multi-policy environments.

---

When multiple admission policies evaluate the same resource, execution order matters. Mutations must complete before validation, certain policies should run before others, and performance-critical validations should fail fast. Understanding admission control ordering prevents policy conflicts and optimizes cluster performance. This guide explains how Kubernetes orders admission control and how to configure it properly.

## Understanding Admission Chain Order

Kubernetes processes admission in this order:

1. Mutating webhooks execute first
2. Object schema validation runs
3. Validating webhooks execute
4. Resource persistence to etcd

Within mutating webhooks and validating webhooks, execution order depends on webhook configuration names (alphabetical by default) unless overridden by match conditions or failure policies.

## Configuring Webhook Order with Names

Control execution order through naming:

```yaml
# Executes first (alphabetically)
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: 01-inject-defaults
webhooks:
  - name: defaults.company.com
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /mutate/defaults

---
# Executes second
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: 02-inject-sidecars
webhooks:
  - name: sidecars.company.com
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /mutate/sidecars

---
# Validates after mutations
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: 01-validate-security
webhooks:
  - name: security.company.com
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate/security
```

Prefix webhook names with numbers to control order explicitly.

## Mutation Before Validation

Ensure mutations complete before validation runs:

```yaml
# Mutation: Add resource limits
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: 01-add-resource-limits
webhooks:
  - name: limits.mutate.company.com
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /mutate/limits

---
# Validation: Check resource limits exist
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: 02-validate-resource-limits
webhooks:
  - name: limits.validate.company.com
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate/limits
```

Mutations always run before validations, so this configuration ensures added limits get validated.

## Handling Policy Dependencies

Order policies that depend on each other:

```yaml
# First: Add labels
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: 01-add-team-label
spec:
  rules:
    - name: add-label
      match:
        any:
          - resources:
              kinds: [Pod]
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(team): "default-team"

---
# Second: Validate label format
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: 02-validate-team-label
spec:
  rules:
    - name: check-label-format
      match:
        any:
          - resources:
              kinds: [Pod]
      validate:
        message: "team label must be lowercase"
        pattern:
          metadata:
            labels:
              team: "?*"
        deny:
          conditions:
            any:
              - key: "{{ request.object.metadata.labels.team }}"
                operator: NotEquals
                value: "{{ toLower(request.object.metadata.labels.team) }}"
```

The mutation adds labels that the validation then checks.

## Fast-Fail Validations First

Put quick validations early to reject bad requests fast:

```yaml
# Fast: Check namespace exists (local check)
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: 01-fast-namespace-check
webhooks:
  - name: namespace.validate.company.com
    timeoutSeconds: 3
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate/namespace

---
# Slow: Check external registry (external API call)
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: 02-slow-registry-check
webhooks:
  - name: registry.validate.company.com
    timeoutSeconds: 15
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate/registry
```

Fast validations fail early, avoiding expensive operations on invalid requests.

## Avoiding Circular Dependencies

Prevent policies from conflicting:

```yaml
# DON'T DO THIS - Circular dependency
# Policy A adds label X if label Y exists
# Policy B adds label Y if label X exists

# DO THIS - Make dependencies explicit
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: 01-add-base-labels
spec:
  rules:
    - name: add-base
      match:
        any:
          - resources:
              kinds: [Pod]
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(managed-by): "kyverno"

---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: 02-add-derived-labels
spec:
  rules:
    - name: add-derived
      match:
        any:
          - resources:
              kinds: [Pod]
              selector:
                matchLabels:
                  managed-by: "kyverno"  # Only runs after first policy
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(tracking): "enabled"
```

Each policy has clear preconditions preventing circular execution.

## Match Conditions for Ordering

Use match conditions to control when policies run:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: conditional-validation
spec:
  rules:
    - name: validate-after-mutation
      match:
        any:
          - resources:
              kinds: [Pod]
      preconditions:
        all:
          # Only run if mutation has completed
          - key: "{{ request.object.metadata.labels.mutated }}"
            operator: Equals
            value: "true"
      validate:
        message: "Validation after mutation"
        pattern:
          metadata:
            labels:
              mutated: "true"
              team: "?*"
```

## Webhook Reinvocation Policy

Configure if webhooks should be called again after mutations:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: validate-with-reinvocation
webhooks:
  - name: validate.company.com
    reinvocationPolicy: IfNeeded  # Re-run if mutations changed object
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate
```

Use `IfNeeded` when validation depends on mutated fields. Use `Never` (default) for better performance.

## Monitoring Policy Execution

Track policy execution order with metrics:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
)

var (
    policyExecutionOrder = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "admission_policy_execution_order",
            Help: "Order of policy execution",
        },
        []string{"policy", "sequence"},
    )
)

func executePolicy(policyName string, sequence int) {
    policyExecutionOrder.WithLabelValues(policyName, fmt.Sprintf("%d", sequence)).Inc()
    // ... execute policy ...
}
```

Query metrics to verify execution order:

```promql
# Policies executed first
admission_policy_execution_order{sequence="1"}

# Check for unexpected ordering
rate(admission_policy_execution_order{sequence="2"}[5m])
```

## Testing Policy Ordering

Verify ordering with integration tests:

```yaml
# test-ordering.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-ordering
  labels:
    test: "ordering"
spec:
  containers:
    - name: nginx
      image: nginx
```

Apply and check final state:

```bash
# Apply test pod
kubectl apply -f test-ordering.yaml

# Check applied mutations in order
kubectl get pod test-ordering -o yaml | grep -A5 labels

# Expected order of labels:
# 1. team: default-team (from policy 01)
# 2. managed-by: kyverno (from policy 02)
# 3. tracking: enabled (from policy 03)
```

## Performance Optimization

Optimize policy order for performance:

```yaml
# Pattern: Fast failures first, expensive checks last
webhooks:
  # 1. Quick schema validation
  - name: 01-schema-check
    timeoutSeconds: 2

  # 2. Medium complexity
  - name: 02-label-validation
    timeoutSeconds: 5

  # 3. Expensive external calls
  - name: 03-registry-validation
    timeoutSeconds: 15

  # 4. Very expensive (optional)
  - name: 04-vulnerability-scan
    timeoutSeconds: 30
    failurePolicy: Ignore  # Don't block on timeout
```

## Handling Race Conditions

Prevent race conditions in concurrent policies:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: thread-safe-mutation
spec:
  rules:
    - name: safe-counter-increment
      match:
        any:
          - resources:
              kinds: [ConfigMap]
              names: [counter]
      mutate:
        patchesJson6902: |-
          - op: test
            path: /data/count
            value: "{{ request.object.data.count }}"
          - op: replace
            path: /data/count
            value: "{{ add(request.object.data.count, 1) }}"
```

The test operation ensures the value hasn't changed since read.

## Conclusion

Admission policy ordering determines how mutations and validations interact in Kubernetes. Control execution order through webhook naming, ensure mutations complete before validations, and place fast-fail validations early. Use match conditions and preconditions to manage policy dependencies, configure reinvocation policies appropriately, and avoid circular dependencies. Monitor policy execution order with metrics, test ordering in integration tests, and optimize for performance by ordering policies from fastest to slowest.

Proper policy ordering ensures reliable admission control without conflicts or performance issues.
