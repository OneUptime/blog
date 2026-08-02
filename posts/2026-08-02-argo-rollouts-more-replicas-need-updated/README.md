# Why an Argo Rollout Is Stuck on “More Replicas Need to Be Updated”

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, ReplicaSet, Pod Scheduling, Readiness Probes, Troubleshooting, Progressive Delivery

Description: Diagnose the Argo Rollouts “more replicas need to be updated” status by tracing the desired revision from ReplicaSet scaling through pod availability and controller reconciliation.

---

“More replicas need to be updated” means Argo Rollouts has not yet reached the updated-replica state required for the current reconciliation point. It is a progress message, not a root cause.

The missing replicas may not have been created, may be Pending, may be repeatedly crashing, may be Ready but not yet Available, or may be caught in competing controller updates. Start from the Rollout tree and follow one new-revision pod through scheduling and readiness.

## Read the Rollout's Replica Accounting

```bash
kubectl argo rollouts get rollout payments
kubectl get rollout payments -o yaml
```

Compare these values:

- `.spec.replicas`: steady-state desired count, possibly written by an autoscaler;
- `.status.replicas`: current pods across owned ReplicaSets;
- `.status.updatedReplicas`: pods using the latest pod template;
- `.status.readyReplicas`: pods whose readiness condition is true;
- `.status.availableReplicas`: ready pods that satisfy availability timing;
- current step, desired weight, actual weight, and pause conditions.

A Rollout can have the correct total pod count but too few **updated** pods. It can also have enough updated pods but too few available ones to scale old capacity down safely.

## Identify the New ReplicaSet

The plugin shows stable and canary ReplicaSets clearly. You can also list them:

```bash
kubectl get rs -n payments -l app=payments \
  -L rollouts-pod-template-hash
kubectl describe rollout payments -n payments
```

Inspect the newest ReplicaSet's desired, current, ready, and available counts. Do not manually scale it: Argo Rollouts owns associated ReplicaSets and will overwrite external changes.

If no new ReplicaSet exists, confirm the intended release actually changed `.spec.template`. Changing only Rollout annotations outside the pod template, step timing, or a Git value that renders identically does not create a new revision. Also confirm the selector matches the pod-template labels and is not shared accidentally with another workload.

## If Pods Were Never Created

Describe the ReplicaSet and review recent events:

```bash
kubectl describe rs <new-replicaset> -n payments
kubectl get events -n payments --sort-by=.lastTimestamp | tail -50
```

Common creation blockers include:

- namespace `ResourceQuota` or object-count quota;
- LimitRange or admission-policy rejection;
- missing ServiceAccount, Secret, ConfigMap, PVC, or image pull secret;
- forbidden pod fields under Pod Security admission;
- no rollout surge headroom under strict CPU/memory quota;
- controller RBAC or API update errors.

`maxSurge` allows extra pods during a canary transition, but quota and cluster capacity still have to permit them. `maxUnavailable: 0` protects availability and can also prevent old pods from being removed to make quota room. Fix the capacity or policy conflict rather than weakening availability blindly.

## If New Pods Are Pending

```bash
kubectl get pods -n payments -l app=payments -o wide
kubectl describe pod <new-pod> -n payments
```

Read the scheduler events. Typical causes are insufficient CPU or memory, unmatched node selectors or affinity, untolerated taints, unbound PVCs, topology-spread constraints, and namespace quota.

Cluster autoscaling is not instantaneous. Determine whether it can actually provision a node matching the pod's zones, architecture, storage, and taints. A pod that requests an impossible combination remains Pending no matter how long the rollout waits.

## If Pods Start but Never Become Available

Inspect status, events, current logs, and previous crash logs:

```bash
kubectl describe pod <new-pod> -n payments
kubectl logs <new-pod> -n payments --all-containers
kubectl logs <new-pod> -n payments --all-containers --previous
```

Look for:

- `ErrImagePull`, `ImagePullBackOff`, or platform-incompatible images;
- `CrashLoopBackOff` from configuration or dependency failures;
- failing startup, readiness, or liveness probes;
- init containers that never complete;
- volume mount or permission errors;
- sidecars that fail readiness;
- termination hooks or finalizers delaying old pod removal.

`minReadySeconds` can make a Ready pod wait before it counts as Available. The Rollout specification also has `progressDeadlineSeconds`; time spent manually paused does not count toward progress estimation. Treat probe and deadline changes as production behavior changes, not as a way to silence the message.

## Account for the Current Strategy Step

Without traffic routing, canary weight is approximated using integer replica counts. A small Rollout may need to round to a different number of canary pods than the percentage suggests, and surge rules can temporarily increase the total.

With traffic routing, weight and replicas can differ. Check for an active `setCanaryScale`, `dynamicStableScale`, HPA updates to total replicas, and provider route reconciliation. A fixed canary count may be intentional even when traffic weight is higher.

If an HPA is rapidly changing `.spec.replicas`, stabilize the metric and scale behavior; do not attach an HPA to the underlying ReplicaSets. Check managed fields to find every writer:

```bash
kubectl get rollout payments -n payments \
  -o yaml --show-managed-fields
```

## Check the Controller When Workload State Looks Healthy

If the newest ReplicaSet and its pods are available but status does not progress, inspect the Argo Rollouts controller:

```bash
kubectl logs -n argo-rollouts deploy/argo-rollouts --since=30m \
  | grep 'payments'
kubectl get deploy argo-rollouts -n argo-rollouts
```

Look for RBAC denials, API conflicts while updating ReplicaSets, traffic-provider errors, work-queue retries, or a controller that is not watching the namespace. Confirm the installed controller and CRDs are a supported matching release.

The official project issue tracker records rare historical cases involving repeated ReplicaSet update conflicts and a stuck status. Do not assume every occurrence is that bug. First eliminate workload, quota, scheduling, autoscaling, and routing causes; then compare controller version and logs with current release notes and known issues. A controller restart may trigger reconciliation, but it does not repair an impossible pod or a persistent permission error.

## A Fast Triage Order

1. Capture the Rollout tree and status counts.
2. Identify the latest ReplicaSet and its desired/current/ready/available counts.
3. If no pods exist, read ReplicaSet and admission events.
4. If pods are Pending, read scheduler and PVC events.
5. If pods are unready, inspect init containers, images, probes, mounts, and logs.
6. Compare surge/unavailable limits with quota and cluster headroom.
7. Check HPA/KEDA, `setCanaryScale`, and the current traffic-routing step.
8. Verify no external system scales or edits owned ReplicaSets.
9. Inspect controller and traffic-provider reconciliation errors.
10. Upgrade only after matching evidence to a fixed issue.

The status clears when the latest ReplicaSet reaches the count and availability the controller requires. Find which transition stopped, and fix that transition rather than manipulating the summary message.

## Official Documentation

- [Argo Rollouts: Rollout Specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: Canary Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Kubectl Plugin](https://argo-rollouts.readthedocs.io/en/stable/features/kubectl-plugin/)
- [Argo Rollouts: Architecture](https://argo-rollouts.readthedocs.io/en/stable/architecture/)
- [Kubernetes: Debugging Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Pod Lifecycle and Readiness](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Argo Rollouts issue #3316: ReplicaSet update conflict investigation](https://github.com/argoproj/argo-rollouts/issues/3316)

