# Tune VPA Eviction Tolerance and Rate for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Production Operations, Pod Eviction, Rate Limiting

Description: Tune current VPA updater controls from an explicit disruption budget, with exact defaults, interactions, staged rollout, metrics, and rollback guidance.

---

Production VPA tuning is a disruption-budget exercise. `--updater-interval` controls how often the updater evaluates work, `--eviction-tolerance` limits concurrent impact within a replica group, and `--eviction-rate-limit` plus `--eviction-rate-burst` configure updater-process-wide action throttles. They do not replace PodDisruptionBudgets or application availability design.

## Start from the Current Defaults

Upstream VPA 1.7.1 documents these updater defaults:

```text
--updater-interval=1m
--eviction-tolerance=0.5
--eviction-rate-limit=-1
--eviction-rate-burst=1
--min-replicas=2
--pod-update-threshold=0.1
--in-recommendation-bounds-eviction-lifetime-threshold=12h
```

A rate limit of `0` or `-1` disables the rate limiter. `eviction-rate-burst` matters only with a positive rate. The tolerance is a fraction of the updater's per-owner replica-group count and is truncated to an integer. ReplicaSets, StatefulSets, and ReplicationControllers use `spec.replicas`; Jobs use the actual live Pod count, DaemonSets use `status.numberReady`, and Deployment Pods are grouped by their owning ReplicaSet. Current restriction logic still has a special case that permits one update when all replicas are running and the computed tolerance is zero.

Do not read `0.5` as permission to lose half the service. Existing Pending Pods, updates already initiated in the loop, VPA's minimum replica check, and Kubernetes PDB admission all affect what can proceed.

## Set an Application Disruption Objective First

For each workload, write down:

- minimum healthy replicas or quorum;
- maximum simultaneous restarts;
- normal replacement and readiness duration;
- acceptable VPA-caused changes per hour;
- peak rollout and node-maintenance overlap; and
- whether container restart, Pod eviction, or only non-restarting resize is allowed.

Encode application availability in `policy/v1` PodDisruptionBudgets. VPA's tolerance is an additional internal limit. Eviction calls the Kubernetes Eviction API, so the stricter effective constraint wins.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: checkout
  namespace: payments
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: checkout
```

## Tune One Dimension at a Time

An intentionally conservative updater example is:

```yaml
spec:
  template:
    spec:
      containers:
        - name: updater
          args:
            - --updater-interval=2m
            - --eviction-tolerance=0.2
            - --eviction-rate-limit=0.1
            - --eviction-rate-burst=1
            - --min-replicas=2
            - --pod-update-threshold=0.1
```

`0.1` permits the eviction limiter one token about every 10 seconds after an initial burst of one. VPA 1.7.1 creates a separate in-place limiter from the same rate and burst and uses it for in-place resize and unboost attempts. Each limiter is updater-process-wide, not per-VPA or per-namespace, so `0.1` is not a combined cap across both action paths.

Each updater run receives a context deadline equal to `--updater-interval`. A very low rate combined with many queued Pods can make limiter waits exhaust that context before all queued actions start. Increase the interval or rate based on measured queue drain rather than setting both arbitrarily low.

### Updater Interval

A shorter interval detects eligible changes sooner but increases per-loop cache scans, calculation, and admission-controller status-check activity. It cannot make the recommender produce fresh targets faster than its own interval, and it cannot bypass PDB or readiness recovery. A longer interval reduces evaluation frequency and reaction speed, including scale-up after under-requesting.

### Eviction Tolerance

Lower tolerance limits concurrent impact within each replica-owner group. It uses the per-owner count described above and internal running/Pending accounting, not application quorum. Use a PDB and accurate readiness for business availability. Test odd and small replica counts because integer truncation matters.

### Rate and Burst

A positive rate applies separately to each action path across many VPAs and can prevent fleet-wide waves. Keep burst small when replacement startup is expensive. The limiters control starts of actions, not completion; a Pod that takes five minutes to become Ready can overlap later actions unless the internal replica restriction-or, for evictions, PDB admission-prevents it.

## Use Per-VPA Controls Where Available

`spec.updatePolicy.minReplicas` overrides the global minimum for one VPA:

```yaml
spec:
  updatePolicy:
    updateMode: Recreate
    minReplicas: 4
```

`evictionRequirements` can limit eviction direction, such as allowing memory scale-up but not scale-down. Eviction tolerance, interval, and rate remain component flags in the current API; isolate namespaces with separate updater deployments and `--vpa-object-namespace` only if you are prepared to operate distinct controller ownership without overlap.

Never run two active updaters over the same VPA scope. If replicas are used for availability, enable leader election. For multiple independently active namespace-scoped updater groups, give each leader-election group a distinct `--leader-elect-resource-name`; otherwise they contend for the default `vpa-updater` Lease in `kube-system`.

## Roll Out and Measure

Start new VPAs in `Off`, then enable one low-risk namespace or workload cohort. Watch:

```bash
kubectl get vpa -A
kubectl get pdb -A
kubectl get events -A --field-selector reason=EvictedByVPA
kubectl -n kube-system logs deploy/vpa-updater --since=1h
```

Scrape updater metrics for controlled, evictable, evicted, failed-eviction, in-place eligible, updated, and failed-attempt counts. Correlate them with application availability, replacement readiness, scheduler Pending time, node-autoscaler latency, API server load, and admission webhook errors.

For normal VPA actuation, set affected objects to `Off`, then restore updater arguments through the installation source. Existing Pods retain already applied resources. Alpha CPU Startup Boost is a separate path: `Off` does not disable a configured boost. For a graceful rollback, disable `CPUStartupBoost` on the admission controller to stop new boosts, leave the boost configuration and updater gate active until existing boosts unboost, then remove the configuration and disable the updater gate. For immediate rollback, first remove the boost configuration and wait for the admission controller to observe the change while the feature gates remain enabled; then deliberately replace any still-boosted Pods, or resize them and remove their boost annotations, before disabling the gates. Disabling the updater gate stops its unboost path, so already boosted Pods are not automatically unboosted.

## Official Documentation

- [VPA updater flags and exact defaults](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/flags.md#what-are-the-parameters-to-vpa-updater)
- [VPA eviction restriction source](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/restriction/pods_restriction_factory.go)
- [VPA updater rate-limiter source](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/logic/updater.go)
- [VPA API update policy](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/api.md#podupdatepolicy)
- [VPA CPU Startup Boost enablement and rollback](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/enhancements/7862-cpu-startup-boost/README.md#feature-enablement-and-rollback)
- [Kubernetes Pod disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Configure a PodDisruptionBudget](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)

## Conclusion

Tune the updater from measured recovery time and an application availability target. Let PDBs express service safety, use VPA tolerance as an internal concurrency bound, use positive updater-process-wide rate limits to prevent fleet waves, and choose an interval that can drain the intended queue. Stage each change and judge it by completed healthy replacements, not merely eviction count.
