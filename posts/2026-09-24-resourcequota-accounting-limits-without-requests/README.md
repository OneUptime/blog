# How to Predict ResourceQuota Accounting When a Container Sets Limits but Omits Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, Troubleshooting

Description: Predict the quota charged to containers with limits but omitted requests, then inspect the admitted Pod rather than only its workload template.

---

A container that specifies `limits.cpu: "1"` and omits its CPU request can consume a full core of request quota. Omitting the field does not necessarily create a cheap, best-effort workload. Defaulting happens before the quota decision, and the final Pod is the object that matters.

This walkthrough uses ordinary container-level CPU and memory resources. It deliberately excludes Pod-level resource budgets, injected sidecars, init containers, and in-place resize so that the arithmetic stays visible. Those features require checking the effective resource model for your cluster version.

## Establish the defaulting rule

The [Kubernetes resource-management documentation](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#requests-and-limits) explains that when a limit exists but a request is absent, Kubernetes can copy the limit into the request. The [v1.36 Pod API defaulting implementation](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/apis/core/v1/defaults.go) performs this per missing resource key for regular and init containers.

For a single container with no additional mutation:

| Submitted CPU fields | Effective CPU request | CPU limit |
| --- | --- | --- |
| Limit `1`, request omitted | `1` | `1` |
| Limit `1`, request `250m` | `250m` | `1` |
| Request `250m`, limit omitted | `250m` | Unspecified unless defaulted |
| Both omitted | Depends on namespace defaults | Depends on namespace defaults |

CPU and memory are handled independently. An explicit CPU request does not prevent an omitted memory request from being defaulted from its memory limit.

## Calculate the rejected increment

Suppose a quota allows `requests.cpu: "4"` and currently records `3`. The next Pod contains two containers, each with a CPU limit of `750m` and no explicit request. Without other mutations, their effective requests total `1500m`; the new total would be `4500m`, exceeding the quota.

The same Pod also contributes `1500m` to `limits.cpu` if that key is enforced. Passing the request budget does not imply passing the limit budget, or vice versa. The quota keys `cpu` and `memory` are aliases for their request counterparts, as documented in [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/).

## Observe a Pod admission without creating it

Use an existing disposable namespace with representative policies. Save this as `limit-only-pod.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: limit-only-probe
spec:
  restartPolicy: Never
  containers:
    - name: worker
      image: busybox:1.36
      command: ["sh", "-c", "sleep 30"]
      resources:
        limits:
          cpu: "750m"
          memory: "256Mi"
```

Run admission using the server:

```bash
ns=quota-lab
kubectl create -n "$ns" --dry-run=server -f limit-only-pod.yaml -o json |
  jq '.spec.containers[] | {name, resources}'
```

A successful response exposes the mutated resources without persisting the Pod. If admission rejects the probe, read that rejection first; the command cannot display a final Pod that admission did not accept. Use a representative namespace with adequate test headroom to inspect defaulting independently.

Server dry-run exercises admission under its [dry-run rules](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run), but does not reserve capacity. A successful probe can still be followed by a real rejection if another controller consumes the budget first. A dry-run Deployment also does not create or admit its future Pods, so it cannot replace this Pod-level check.

## Check LimitRange interactions explicitly

```bash
kubectl get limitrange -n "$ns" -o yaml
```

A LimitRange can supply missing limits and requests and enforce minimums, maximums, or ratios. However, do not assume that `defaultRequest.cpu: 100m` will replace the request already derived from an explicitly supplied CPU limit. In the referenced implementation, Pod API defaulting has already filled that missing request before the LimitRange admission plugin applies defaults.

When both fields are omitted, a LimitRange with a `100m` default request and `750m` default limit produces a different budget from a manifest that explicitly supplies only the `750m` limit. Multiple LimitRanges or additional mutating webhooks make inspection even more valuable. See the [LimitRange documentation](https://kubernetes.io/docs/concepts/policy/limit-range/) for defaulting and validation constraints.

## Make the workload's intent explicit

Set requests and limits deliberately in the controller template, then inspect an admitted Pod. Choose requests from the workload's actual capacity needs; reducing a request merely to squeeze through quota changes scheduling and resource protection.

Multiply the effective per-Pod budget by the number of concurrent Pods, including rollout overlap and batch workers. Finally, verify that every applicable quota has room. A correct single-Pod calculation is useful only when the intended rollout also fits.
