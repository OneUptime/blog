# How to Find Which Pending and Terminating Pods Are Still Consuming Namespace Quota

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, Troubleshooting

Description: Identify Pending and deleting Pods that still affect namespace quota, and distinguish lifecycle quota from persisted object counts.

---

An idle Pending Pod can consume CPU request quota, while a completed Pod can still consume an object-count quota. These counters measure different things. Before deleting anything, identify the quota key and the lifecycle rules that apply to it.

The [ResourceQuota reference](https://kubernetes.io/docs/concepts/policy/resource-quotas/) distinguishes compute quota from object counts. The precise deletion behavior below is verified against the [Kubernetes v1.36 Pod quota evaluator](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/quota/v1/evaluator/core/pods.go); check the corresponding source for your server version when investigating a discrepancy.

## Start with the quota key

```bash
ns=payments
kubectl get resourcequota -n "$ns" -o json | jq '
  .items[] | {name: .metadata.name, scopes: .spec.scopes,
    selector: .spec.scopeSelector, hard: .status.hard, used: .status.used}'
```

`requests.cpu` and `requests.memory` measure declared resource requirements for eligible Pods. They do not follow actual utilization. The `pods` quota also follows Pod lifecycle eligibility. In contrast, `count/pods` tracks Pod objects that remain stored, including completed objects.

This is why deleting completed Pods may reduce `count/pods` while leaving `requests.cpu` unchanged. Those completed Pods had already stopped contributing compute quota. A running container's low utilization is equally irrelevant to its declared request.

## Inventory phase and deletion independently

`kubectl` may display `Terminating` in its status column, but that is not a Pod phase. Inspect the phase and deletion metadata separately:

```bash
kubectl get pods -n "$ns" -o json | jq -r '
  (["POD","PHASE","DELETION_TIMESTAMP","GRACE_SECONDS","NODE","OWNER"] | @tsv),
  (.items[] | [
    .metadata.name, (.status.phase // "Unknown"),
    (.metadata.deletionTimestamp // "-"),
    (.metadata.deletionGracePeriodSeconds // "-"),
    (.spec.nodeName // "unscheduled"),
    ([.metadata.ownerReferences[]? | select(.controller == true)
      | (.kind + "/" + .name)] | join(","))
  ] | @tsv)'
```

Keep all Pods in this report initially. Filtering only `Running` misses Pending consumers; filtering only `Pending` misses deleting objects. The [Pod lifecycle documentation](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) explains phase, deletion, and finalization separately.

Pending Pods generally count for compute quota even if they have never been scheduled. Terminal `Succeeded` and `Failed` Pods are excluded from compute quota. In the referenced evaluator, a nonterminal deleting Pod becomes ineligible when both deletion fields exist and the current time is later than `deletionTimestamp + deletionGracePeriodSeconds`. That is an evaluator rule, not a promise that the API object has disappeared or that every quota counter updates at that instant.

## Do not confuse the Terminating scope with deletion

A quota with the `Terminating` scope matches Pods with an active deadline. It does not select Pods merely because deletion is underway. Likewise, `NotTerminating` is not a filter for the absence of a deletion timestamp.

When a quota is scoped, compare its selector with each candidate Pod before attributing usage. A high-priority Pending Pod might affect both an overall quota and a PriorityClass-specific quota. Adding those two counters together would count overlapping usage twice.

## Inspect the largest candidates without inventing a total

```bash
kubectl get pods -n "$ns" -o json | jq '
  .items[]
  | select(.status.phase == "Pending" or .metadata.deletionTimestamp != null)
  | {name: .metadata.name, phase: .status.phase,
     priorityClass: .spec.priorityClassName,
     podResources: .spec.resources, overhead: .spec.overhead,
     containers: [.spec.containers[] | {name, resources}],
     initContainers: [.spec.initContainers[]? | {name, restartPolicy, resources}]}'
```

This is an investigation report, not a reimplementation of quota accounting. Init containers, restartable sidecars, Pod-level resources, overhead, and in-place resize status can affect the calculation. Preserve quantities such as `500m` and `1Gi` instead of coercing them into plain numbers.

## Reclaim the intended resource

For an unnecessary Pending workload, correct or scale its owner; deleting one Pod can simply cause a replacement. For a deleting Pod, inspect finalizers, node health, and storage cleanup before intervening. Removing a finalizer without completing its cleanup can leak infrastructure or leave application state unsafe.

After the legitimate lifecycle change, watch both the object and ResourceQuota. Reconciliation is asynchronous, so object deletion and a lower `status.used` need not arrive in the same observation. If the expected counter remains wrong after normal reconciliation, investigate the quota controller with the saved inventory and server version. Do not use a stuck quota as a reason to force-delete unrelated workloads.
