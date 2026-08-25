# Why Won’t VPA Update a Single-Replica Pod? Check minReplicas, PodDisruptionBudgets, and Controller Ownership

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, PodDisruptionBudget, High Availability, Troubleshooting

Description: Explain why VPA withholds a single-replica update and choose a safe remedy by checking minReplicas, disruption budgets, direct controller ownership, and update mode.

---

VPA normally refuses to evict a single-replica workload because the updater's global `--min-replicas` default is 2. That safety check is independent of the recommendation: status can contain a valid target while the only running Pod remains unchanged.

## Confirm Every Blocking Layer

```bash
kubectl -n accounts get vpa ledger -o yaml
kubectl -n accounts get deploy ledger -o jsonpath='{.spec.replicas}{"\n"}'
kubectl -n accounts get pod -l app=ledger \
  -o custom-columns=NAME:.metadata.name,OWNER_KIND:.metadata.ownerReferences[0].kind,OWNER:.metadata.ownerReferences[0].name,READY:.status.containerStatuses[*].ready
kubectl -n accounts get pdb -o wide
kubectl -n kube-system logs deploy/vpa-updater --since=30m
```

Check four separate decisions:

1. `updateMode` must allow a lifetime update. `Off` and `Initial` do not.
2. The number of live replicas must meet `minReplicas`.
3. VPA's internal replica-group budget must permit the update attempt; if the path uses eviction, every matching PodDisruptionBudget must also permit it.
4. VPA must identify a managing controller that can recreate an evicted Pod.

For `Recreate` and an `InPlaceOrRecreate` fallback, the updater calls the Kubernetes Eviction API. A PDB with `maxUnavailable: 0`, `minAvailable: 1`, or `minAvailable: 100%` therefore blocks eviction of a healthy one-replica workload. Lowering VPA's replica minimum does not override that PDB. A successful in-place `/resize` does not call the Eviction API, so Kubernetes does not consult the PDB for that patch.

## Prefer Adding Availability

If the application can run concurrently, scale it to at least two replicas and define a PDB that permits one disruption:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ledger
  namespace: accounts
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: ledger
```

```bash
kubectl -n accounts scale deployment ledger --replicas=2
kubectl -n accounts get pdb ledger -w
```

Wait for both Pods to be Ready and for `status.disruptionsAllowed` to become positive. A PDB constrains voluntary eviction but does not create redundancy; the second healthy replica does.

## Override `minReplicas` Only When Downtime Is Acceptable

The current VPA API permits a positive per-object override:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ledger
  namespace: accounts
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ledger
  updatePolicy:
    updateMode: Recreate
    minReplicas: 1
```

This overrides the global updater flag for this VPA. It does not promise zero downtime and does not bypass a PDB. If eviction succeeds, there is an interval with no application Pod while the Deployment creates and readies a replacement.

Changing the global updater argument to `--min-replicas=1` affects every VPA handled by that updater and is therefore broader than the per-VPA field.

## Verify Direct Controller Ownership

VPA does not update unmanaged Pods. It also validates that `targetRef` identifies the topmost supported or scalable controller. For a Deployment, target the Deployment—not its transient ReplicaSet:

```yaml
targetRef:
  apiVersion: apps/v1
  kind: Deployment
  name: ledger
```

A bare Pod has no controller to replace it after eviction. A custom resource needs a `/scale` subresource with a label selector, and the Pods must be directly owned by that target; indirect custom-controller ownership is unsupported.

## Consider Non-Evicting Paths

For a truly interruption-intolerant singleton:

- keep VPA in `Off` and apply reviewed requests during a maintenance window;
- use `Initial` so only naturally created replacements receive recommendations;
- use `InPlaceOrRecreate` only if fallback eviction is acceptable; or
- on VPA 1.7+, evaluate alpha `InPlace` mode, which never evicts but can leave an infeasible resize unapplied indefinitely.

Current `InPlaceOrRecreate` uses VPA's internal `minReplicas` prefilter and replica-group tolerance accounting before an in-place attempt by default, even though a successful `/resize` is not a PDB-governed eviction. With `--in-place-skip-disruption-budget=true`, `InPlaceOrRecreate` and `InPlace` may pass the `minReplicas` prefilter. VPA grants direct no-budget approval only when no regular container declares `RestartContainer` for any resource; the current check scans the whole Pod rather than only resources changed by this recommendation. A Pod with any `RestartContainer` entry is still evaluated against the replica-group availability calculation. Any `InPlaceOrRecreate` fallback eviction still goes through the Eviction API and its PDB enforcement.

## Official Documentation

- [VPA FAQ: recommendations for a single-Pod ReplicaSet](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#i-get-recommendations-for-my-single-pod-replicaset-but-they-are-not-applied)
- [VPA API: updateMode and minReplicas](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md)
- [VPA component flags](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA replica-group restriction source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/restriction/pods_restriction_factory.go)
- [VPA in-place restriction source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/restriction/pods_inplace_restriction.go)
- [Kubernetes Pod disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Configure a PodDisruptionBudget](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)

## Conclusion

A single-replica VPA is usually waiting on an availability policy, not missing a recommendation. Add a healthy replica when possible. If singleton downtime is explicitly acceptable, set per-VPA `minReplicas: 1` and make the PDB consistent; otherwise use observation, creation-time mutation, or a carefully versioned non-evicting mode.
