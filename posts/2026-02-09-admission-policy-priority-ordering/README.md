# How to Configure Admission Policy Priority and Ordering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Admission Control, Policy Ordering, Webhook, Architecture

Description: Learn how to configure admission policy priority and execution ordering, manage dependencies between mutating and validating webhooks, optimize policy performance.

---

When multiple admission policies evaluate the same resource, execution order matters. Mutations must complete before validation, dependent policy logic should be kept together, and performance-critical validations should do cheap checks before expensive work. Understanding admission control ordering prevents policy conflicts and optimizes cluster performance. This guide explains how Kubernetes orders admission control and how to configure it properly.

## Understanding Admission Chain Order

Kubernetes processes admission in this order:

1. Mutating webhooks execute first
2. Object schema validation runs
3. Validating webhooks execute
4. Resource persistence to etcd

Mutating webhooks are called serially, but Kubernetes does not provide a supported way to force their order by naming `MutatingWebhookConfiguration` objects. Validating webhooks are called in parallel, so their relative order must not be used for policy correctness.

## Configuring Webhook Scope with Names

Use clear names to make webhook intent visible in audit logs and metrics, but do not rely on names to control execution order:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: inject-defaults
webhooks:
  - name: defaults.company.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /mutate/defaults

---
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: inject-sidecars
webhooks:
  - name: sidecars.company.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
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
  name: validate-security
webhooks:
  - name: security.company.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate/security
```

If one webhook depends on another, combine the dependent logic in one webhook implementation or make each webhook idempotent and safe to run after the desired state already exists.

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
    admissionReviewVersions: ["v1"]
    sideEffects: None
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
    admissionReviewVersions: ["v1"]
    sideEffects: None
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

Keep dependent Kyverno rules in the same policy and order the rules according to their dependency:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: team-label-policy
spec:
  rules:
    # First: Add labels
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

    # Second: Validate label format
    - name: check-label-format
      match:
        any:
          - resources:
              kinds: [Pod]
      validate:
        message: "team label must be lowercase"
        deny:
          conditions:
            any:
              - key: "{{ request.object.metadata.labels.team }}"
                operator: NotEquals
                value: "{{ toLower(request.object.metadata.labels.team) }}"
```

Kyverno applies mutation rules before validation rules during admission, so the validation sees the added label.

## Fast-Fail Validations First

Validating webhooks run in parallel, so Kubernetes cannot guarantee that one validating webhook fails before another. Keep inexpensive checks cheap and narrow, and put ordered fast-fail logic inside one validating webhook implementation when ordering matters:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: validate-request
webhooks:
  - name: request.validate.company.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
    timeoutSeconds: 3
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate
```

Inside the webhook service, run local checks before expensive external calls so invalid requests can be rejected without unnecessary work.

## Avoiding Circular Dependencies

Prevent policies from conflicting:

```yaml
# DON'T DO THIS - Circular dependency
# Policy A adds label X if label Y exists
# Policy B adds label Y if label X exists

# DO THIS - Make dependencies explicit in one policy
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-managed-labels
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

    - name: add-derived
      match:
        any:
          - resources:
              kinds: [Pod]
              selector:
                matchLabels:
                  managed-by: "kyverno"
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(tracking): "enabled"
```

Each rule has clear preconditions preventing circular execution.

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
kind: MutatingWebhookConfiguration
metadata:
  name: mutate-with-reinvocation
webhooks:
  - name: mutate.company.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
    reinvocationPolicy: IfNeeded  # Re-run if mutations changed object
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /mutate
```

Use `IfNeeded` when a mutating webhook needs a chance to observe later mutations. Use `Never` (default) for better performance when reinvocation is not needed. Use a validating webhook when policy logic must see the final state after mutation.

## Monitoring Policy Execution

Track policy execution order inside your own webhook or policy engine with metrics:

```go
import (
    "fmt"

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

Verify policy interactions with integration tests:

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

# Check applied mutations
kubectl get pod test-ordering -o yaml | grep -A5 labels

# Expected labels:
# team: default-team
# managed-by: kyverno
# tracking: enabled
```

## Performance Optimization

Optimize policy checks for performance:

```yaml
# Pattern inside one webhook service: fast failures first, expensive checks last
webhooks:
  - name: policy.validate.company.com
    admissionReviewVersions: ["v1"]
    sideEffects: None
    timeoutSeconds: 2
    clientConfig:
      service:
        name: webhook
        namespace: webhooks
        path: /validate
```

Inside `/validate`, run quick schema and label checks before external registry or vulnerability checks. Put optional expensive checks behind their own timeout and decide whether failures should block the request.

## Handling Race Conditions

Prevent conflicting concurrent-style policies by making mutations conditional and idempotent:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: idempotent-mutation
spec:
  rules:
    - name: add-tracking-label
      match:
        any:
          - resources:
              kinds: [Pod]
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(tracking): "enabled"
```

The add anchor only writes the label when it is absent, so repeated or reinvoked mutation does not overwrite an existing value.

## Conclusion

Admission policy ordering determines how mutations and validations interact in Kubernetes. Do not rely on webhook names for execution order; instead, make webhooks idempotent, keep dependent logic together, and use validating webhooks when policy logic must see the final object after mutation. Use match conditions and preconditions to manage policy dependencies, configure mutating webhook reinvocation policies appropriately, and avoid circular dependencies. Monitor policy execution with metrics, test policy interactions in integration tests, and optimize performance by running cheap checks before expensive work inside the same policy engine or webhook service.

Proper policy ordering ensures reliable admission control without conflicts or performance issues.
