# Default Pod Resources Without Fighting LimitRange or VPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Go, DevOps

Description: Assign clear ownership for resource defaults, preserve existing requests, and check limits without overriding namespace policy or autoscaling.

A resource-defaulting webhook appears simple: add a CPU request and memory request when they are missing. Problems begin when another component also owns those fields. A namespace LimitRange may already supply defaults. Vertical Pod Autoscaler may choose requests from observed usage. A developer may deliberately submit a smaller value for a lightweight worker.

The design starts with ownership, not arithmetic. Decide which mechanism supplies each field for each workload, then make your webhook a narrow fallback within that contract.

## Distinguish defaults from enforcement

A request is the amount of a resource Kubernetes uses when scheduling a container; a limit constrains usage. CPU and memory limits have different runtime effects. The [resource-management documentation](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) explains these semantics and notes that a limit can become the request when a request is omitted and no admission-time default supplies one.

A default fills an absent value. A mandatory minimum rejects an unacceptable value. Do not implement the second behavior while describing it as the first.

In particular, distinguish an absent map entry from an explicit zero. A present value is still present even if your code considers it unusually small. Preserve it in a defaulting helper; use a separate validation rule if your platform disallows it.

By the time your webhook sees an object, built-in defaulting or other mutation may already have populated fields. The admission object is not a pristine copy of the author's YAML. Field presence is a useful “do not overwrite” signal, but it does not prove which actor supplied the value.

## Prefer the built-in namespace default when it fits

A [LimitRange](https://kubernetes.io/docs/concepts/policy/limit-range/) can supply container defaults and impose resource constraints in a namespace. If every container in that namespace should receive the same fallback, another defaulting webhook may be unnecessary.

This complete example uses Kubernetes v1.35 fields. The numbers illustrate a policy shape; choose values from your workload requirements before applying them in an approved namespace.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-defaults
  namespace: workloads
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:
        cpu: 500m
        memory: 512Mi
```

`defaultRequest` supplies requests and `default` supplies limits. This is not a recommendation that every service needs a CPU limit or these particular amounts. A valid configuration for one application can be inappropriate for another.

The [v1.35 LimitRanger implementation](https://github.com/kubernetes/kubernetes/blob/v1.35.0/plugin/pkg/admission/limitranger/admission.go) merges missing resource entries and validates constraints. Review existing LimitRanges before adding another one; multiple defaulting policies make the effective result harder to reason about. Also check namespace quotas. [ResourceQuota](https://kubernetes.io/docs/concepts/policy/resource-quotas/) limits aggregate resource consumption and can reject a request even when its individual container settings look reasonable.

## Reserve a clear lane for autoscaling

Vertical Pod Autoscaler, or VPA, recommends and can update resource settings. Its presence does not mean all containers are controlled identically. Inspect the VPA target, update policy, container policies, and controlled resources.

For a versioned reference, the [VPA 1.3.0 API types](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.3.0/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go) distinguish `RequestsOnly` from `RequestsAndLimits`, support disabling scaling for a container, and define an `Off` update mode. Verify these settings against the VPA release actually installed. An observation-only VPA and an actively mutating VPA are different ownership arrangements.

Use an explicit platform policy to exclude VPA-controlled fields from custom defaulting. Do not assume that your webhook always runs before or after the VPA webhook. If you intentionally combine them, test their composition and reinvocation behavior with the installed versions rather than relying on names or deployment order.

| Field owner | Custom webhook behavior |
|---|---|
| Explicit workload configuration | Preserve the present field. |
| Namespace-wide LimitRange defaults | Prefer that mechanism; avoid a competing fallback. |
| Active VPA control | Leave controlled fields to VPA. |
| Approved custom profile | Fill only missing fields covered by that profile. |
| Unknown ownership | Return a documented decision rather than guessing. |

## Use quantity-aware fallback logic

A custom profile can be useful when a namespace contains distinct workload classes. The following helper handles only missing CPU and memory **requests** for one eligible container. The caller must already have established that the profile owns these defaults and that the Pod is not using a conflicting Pod-level resource policy.

The package was checked with Go 1.25.0 and `k8s.io/api` plus `k8s.io/apimachinery` v0.35.0. It returns proposed additions rather than modifying the container or serializing the whole Pod.

```go
package defaults

import (
    "fmt"
    corev1 "k8s.io/api/core/v1"
)

func MissingRequests(c corev1.Container, defaults corev1.ResourceList) (corev1.ResourceList, error) {
    additions := corev1.ResourceList{}
    for _, resourceName := range []corev1.ResourceName{
        corev1.ResourceCPU, corev1.ResourceMemory,
    } {
        if _, present := c.Resources.Requests[resourceName]; present {
            continue
        }
        proposed, configured := defaults[resourceName]
        if !configured {
            continue
        }
        if proposed.Sign() <= 0 {
            return nil, fmt.Errorf("profile default for %s must be positive", resourceName)
        }
        if limit, present := c.Resources.Limits[resourceName]; present && proposed.Cmp(limit) > 0 {
            return nil, fmt.Errorf("profile request for %s exceeds existing limit", resourceName)
        }
        additions[resourceName] = proposed.DeepCopy()
    }
    return additions, nil
}
```

Kubernetes quantities carry units. A CPU request of `100m` is one tenth of a CPU; `128Mi` is a binary memory quantity. Use the [Quantity comparison method](https://pkg.go.dev/k8s.io/apimachinery@v0.35.0/pkg/api/resource#Quantity.Cmp), not string comparison or a homemade suffix parser.

If a profile proposes `100m` but the existing CPU limit is `50m`, this helper reports a conflict. It neither increases the user's limit nor silently lowers the profile request. That gives the caller a chance to explain which policy needs adjustment. Existing requests are preserved even when another validation rule may later reject them.

Convert only the returned additions into JSON Patch operations. Create missing `resources` or `requests` parent maps only when needed, and add individual keys when those maps exist. Replacing an entire resource map can erase extended resources or settings owned by another component. The helper intentionally does not implement patch construction or admission response wiring.

## Test the actual combinations

Local tests should cover empty requests, one explicit request, an explicit zero, limits below and equal to defaults, equivalent units, and unrelated resources. Verify that the helper does not mutate its input and that a repeated invocation after applying additions returns an empty result.

Then use staging admission tests for combinations the helper cannot reproduce: the namespace's LimitRange, quota usage, VPA configuration, other injectors, and the final persisted Pod. Include ordinary containers and the init-container patterns you support. Do not apply a regular-container resource policy indiscriminately to every container category or to Pod-level budgets.

Keep the test expectations specific. For an explicitly configured request, expect it to survive. For a VPA-owned field, expect the custom webhook to abstain. For an incompatible profile and limit, expect an actionable error rather than a partially modified object.

The goal is a predictable effective resource configuration. Record which policy supplied defaults, observe scheduling and runtime behavior after rollout, and revise the profile through normal configuration review. A default should make an incomplete specification usable without quietly taking control away from its existing owners.
