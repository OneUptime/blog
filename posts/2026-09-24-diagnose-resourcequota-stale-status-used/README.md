# How to Diagnose a ResourceQuota Whose status.used Appears Stale or Incorrect

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, Troubleshooting

Description: Distinguish expected asynchronous quota reconciliation from accounting mistakes and control-plane failures without editing quota status by hand.

---

`ResourceQuota.status.used` is an accounting snapshot maintained by the control plane. If it looks wrong, the cause may be a recent deletion, a different quota scope, an incorrect manual calculation, or a controller that cannot reconcile. Treat these as separate hypotheses before changing quota policy.

The [ResourceQuota documentation](https://kubernetes.io/docs/concepts/policy/resource-quotas/) defines the counters. For implementation details, this investigation follows the [Kubernetes v1.36 quota controller](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/controller/resourcequota/resource_quota_controller.go), which recalculates usage from watched resources and updates status.

## Capture a coherent starting point

```bash
ns=payments
quota=compute-budget
kubectl config current-context
kubectl version -o yaml
kubectl get resourcequota "$quota" -n "$ns" -o json > quota-before.json
jq '{name: .metadata.name, uid: .metadata.uid,
  resourceVersion: .metadata.resourceVersion,
  spec: .spec, status: .status}' quota-before.json
```

Keep the timestamp of collection in the incident notes. `resourceVersion` is an opaque version marker, not a timestamp or a numeric measure of lag. Separately fetched Pod and quota lists do not represent one atomic cross-resource snapshot.

Compare `spec.hard` with `status.hard`. The spec is the desired policy; status shows the control plane's observed accounting state. A recently edited spec can temporarily differ from status. Missing usage is not equivalent to zero, particularly while a newly created quota is initializing.

## Verify that the expectation matches the resource

Use the named key from the rejection or report:

| Key | Common mistaken expectation |
| --- | --- |
| `requests.cpu` | Comparing declared requests with `kubectl top` utilization |
| `pods` | Counting every retained completed Pod |
| `count/pods` | Ignoring completed objects still stored in the API |
| `count/jobs.batch` | Assuming a successful Job no longer counts |
| `requests.storage` | Counting only mounted or bound PVCs |

For CPU and memory, include the effective Pod resource model: defaults, injected containers, init containers, overhead, and relevant feature gates. The [Pod quota evaluator](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/quota/v1/evaluator/core/pods.go) distinguishes lifecycle accounting from persisted object counts.

Read `spec.scopes` and `spec.scopeSelector` too. Comparing a PriorityClass-specific quota with every Pod in the namespace creates a false discrepancy. Two overlapping quotas may each account for the same Pod; their usage should not be summed as independent consumption.

## Observe reconciliation before diagnosing a failure

```bash
kubectl get resourcequota "$quota" -n "$ns" --watch
```

Stop the watch after a suitable observation period for your environment. The controller responds to relevant resource changes and can perform periodic full recalculations. Timing depends on controller configuration and health; do not assume a universal number of seconds after deletion.

Meanwhile, confirm the resource actually changed. A successful delete request may set a deletion timestamp while finalizers keep the object present. For object-count quota, the stored object still matters. For Pod compute quota, terminal phase and deletion-grace rules matter separately.

If the reported total converges without intervention, record the delay and avoid treating one stale sample as an incident. If it remains inconsistent, retain both before and after snapshots, the exact resource inventory, and the operation timestamps.

## Check the control plane's ability to account

For a managed service, send that evidence to the provider. For a self-managed cluster, inspect the active controller manager and API-server logs through your normal operational access. Look for failed list/watch requests, discovery failures, unavailable API resources, status-update errors, and resource-version conflicts that do not resolve.

The [kube-controller-manager reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/) documents the quota synchronization and concurrency options. Increasing worker counts or shortening a sync period is not the first fix for missing permissions, discovery failures, or an unhealthy API server.

Check whether the problem affects one quota, one API resource, one namespace, or the entire cluster. A single custom-resource counter with discovery errors suggests a different investigation from stale Pod counts across all namespaces. Capture affected and unaffected examples to narrow the fault.

## Recover the controller, then verify admission

Fix the demonstrated control-plane problem and observe a fresh reconciliation. Avoid manually resetting `status.used` or deleting and recreating the quota as a repair technique: these actions can obscure evidence or alter enforcement without fixing the cause.

If the usage is correct but the approved workload needs more budget, make an ordinary, reviewed quota change. That is a capacity decision. Recovery from stale accounting is complete when status agrees with the relevant inventory and a representative admission behaves as expected, while the existing policy remains understandable.
