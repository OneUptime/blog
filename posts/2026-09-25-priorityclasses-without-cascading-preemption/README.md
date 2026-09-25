# How to Use PriorityClasses Without Causing Cascading Pod Preemptions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, PriorityClass, Scheduling, High Availability

Description: Limit priority-driven disruption with a small priority hierarchy, non-preempting classes, class-scoped quotas, dependency-aware capacity planning, and staged tests.

---

PriorityClasses decide which workloads yield under contention. They do not create capacity. If a high-priority API displaces its lower-priority queue consumers, retries can increase, more API replicas can appear, and the additional replicas can displace still more consumers.

Prevent that pattern by designing priority around service dependencies and bounded demand. A larger number is not a substitute for a capacity plan.

## Define a small hierarchy with explicit owners

Start with a few workload categories: essential platform services, critical application paths, ordinary services, and interruptible batch work. For each category, document who may use it, maximum intended scale, required node pools, and what can safely yield.

Review dependencies before assigning an API a higher class than its database proxy, DNS path, or queue workers. Services with a joint availability requirement may need comparable protection or dedicated capacity even when their traffic patterns differ.

Avoid assigning the built-in system-critical classes to ordinary applications. Keep application class names and values in platform-owned configuration, with `globalDefault: false` unless changing the default is an intentional cluster-wide decision.

## Use queue priority without eviction when appropriate

An urgent report may deserve to start before normal batch jobs, but still be unable to justify interrupting them. Use a non-preempting class:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: urgent-batch-wait
value: 5000
globalDefault: false
preemptionPolicy: Never
description: "Prefer urgent batch in the queue without evicting running pods."
```

Assign `priorityClassName: urgent-batch-wait` in the Job's pod template. This controls the pod's ability to preempt others; it does not make that pod immune to a higher-priority preemptor. Non-preempting behavior is described in the [Kubernetes priority documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/).

Use an explicitly preempting class only for workloads whose interruption tradeoff has been reviewed:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: application-critical
value: 10000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Reserved for approved critical application paths."
```

These numbers are examples, not a universal hierarchy. Their relative order within the cluster is what matters.

## Bound consumption of the powerful class

Restricting who can create PriorityClass objects does not by itself restrict who can reference an existing class in a pod. Use admission policy to enforce the allowed namespace or workload identities.

Then set a namespace quota for the approved class. This example caps aggregate requests and pod count in an existing `production` namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: application-critical-budget
  namespace: production
spec:
  hard:
    pods: "12"
    requests.cpu: "12"
    requests.memory: 24Gi
  scopeSelector:
    matchExpressions:
    - scopeName: PriorityClass
      operator: In
      values:
      - application-critical
```

The [ResourceQuota documentation](https://kubernetes.io/docs/concepts/policy/resource-quotas/) defines PriorityClass scopes and their supported resource types. The quota constrains admission; it does not reserve those resources on nodes or prevent another namespace from using the same class.

Size the budget for ordinary replicas, rollout surge, and the permitted autoscaling ceiling. If quota blocks new pods, inspect the owning ReplicaSet or Job events: the scheduler cannot preempt its way around a pod creation rejection.

## Keep room for recovery

Plan capacity for simultaneous high-priority growth and the minimum useful replicas of dependencies. Model requests on eligible nodes, including DaemonSets and topology restrictions. Aggregate spare CPU in the wrong pool cannot absorb the displaced workload.

For each preemptible service, decide whether its replacement should wait, scale elsewhere, or resume from a checkpoint. Controllers normally recreate lost replicas, so repeated eviction can become repeated work rather than useful recovery.

Review Deployment surge and unavailable settings when changing class names. A pod-template change creates a rollout, and old and new replicas may overlap. The [Deployment documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) explains this temporary capacity demand.

## Treat disruption budgets as one control

A PodDisruptionBudget is useful for supported voluntary evictions, but scheduler preemption respects it only on a best-effort basis. It cannot guarantee that a lower-priority dependency survives a higher-priority placement request. Likewise, it does not govern Deployment rolling updates in place of rollout settings.

Use PDBs alongside replica placement, resource headroom, and bounded priority use. The [disruptions guide](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/) explains which disruption paths budgets constrain.

## Test displacement before production rollout

In a staging pool with representative requests, fill capacity with approved low-priority workloads, then introduce one critical replica. Record which pods are displaced, how long termination takes, whether replacements fit elsewhere, and whether critical dependencies stay ready.

Repeat at the maximum approved critical replica count and during a rollout. Inspect both pods and events:

```bash
kubectl get pods -A -o custom-columns=NS:.metadata.namespace,NAME:.metadata.name,CLASS:.spec.priorityClassName,PRIORITY:.spec.priority,PHASE:.status.phase
kubectl get events -A --field-selector reason=Preempted
kubectl get events -A --field-selector reason=FailedScheduling
```

Retain events in your observability pipeline because API event history is temporary. Monitor replacement readiness and application errors as well as eviction counts. Stop expansion when displacement repeatedly harms a dependency, then adjust capacity or the priority relationship before raising limits.
