# How to Tune VPA Eviction Tolerance, Updater Interval, and Eviction Rate for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Production Operations, Pod Eviction, Rate Limiting

Description: Tune current VPA updater controls from an explicit disruption budget, with exact defaults, interactions, staged rollout, metrics, and rollback guidance.

---

Production VPA tuning is a disruption-budget exercise. `--updater-interval` controls how often the updater evaluates work, `--eviction-tolerance` limits concurrent impact within a replica group, and `--eviction-rate-limit` plus `--eviction-rate-burst` throttle actions across the updater process. They do not replace PodDisruptionBudgets or application availability design.

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

A rate limit of `0` or `-1` disables the rate limiter. `eviction-rate-burst` matters only with a positive rate. The tolerance is a fraction of the controller's configured replica count and is truncated to an integer; current restriction logic still has a special case that permits one update when all replicas are running and the computed tolerance is zero.

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

`0.1` actions per second allows one token about every 10 seconds, with an initial burst of one. This is a process-wide limiter, not a per-VPA or per-namespace budget. Current updater source also constructs the in-place action limiter from the same rate and burst values, so these flags throttle both eviction and in-place resize attempts in VPA 1.7.1 even though the flag names refer to eviction.

The updater loop has a timeout equal to `--updater-interval`. A very low rate combined with many queued Pods can exhaust the loop context before all actions run. Increase the interval or rate based on measured queue drain rather than setting both arbitrarily low.

### Updater Interval

A shorter interval detects eligible changes sooner but increases API list, calculation, and status-check activity. It cannot make the recommender produce fresh targets faster than its own interval, and it cannot bypass PDB or readiness recovery. A longer interval reduces churn and reaction speed, including scale-up after under-requesting.

### Eviction Tolerance

Lower tolerance limits same-controller concurrent impact. It is based on configured replicas and internal running/Pending accounting, not application quorum. Use a PDB and accurate readiness for business availability. Test odd and small replica counts because integer truncation matters.

### Rate and Burst

A positive global rate prevents a restart wave across many VPAs. Keep burst small when replacement startup is expensive. The rate controls starts of actions, not completion; a Pod that takes five minutes to become Ready can overlap later actions unless replica/PDB checks prevent it.

## Use Per-VPA Controls Where Available

`spec.updatePolicy.minReplicas` overrides the global minimum for one VPA:

```yaml
spec:
  updatePolicy:
    updateMode: Recreate
    minReplicas: 4
```

`evictionRequirements` can limit eviction direction, such as allowing memory scale-up but not scale-down. Eviction tolerance, interval, and rate remain component flags in the current API; isolate namespaces with separate updater deployments and `--vpa-object-namespace` only if you are prepared to operate distinct controller ownership without overlap.

Never run two active updaters over the same VPA scope. If replicas are used for availability, enable leader election.

## Roll Out and Measure

Start new VPAs in `Off`, then enable one low-risk namespace or workload cohort. Watch:

```bash
kubectl get vpa -A
kubectl get pdb -A
kubectl get events -A --field-selector reason=EvictedByVPA
kubectl -n kube-system logs deploy/vpa-updater --since=1h
```

Scrape updater metrics for controlled, evictable, evicted, failed-eviction, in-place eligible, updated, and failed-attempt counts. Correlate them with application availability, replacement readiness, scheduler Pending time, node-autoscaler latency, API server load, and admission webhook errors.

For normal VPA actuation, set affected objects to `Off`, then restore updater arguments through the installation source. Existing Pods retain already applied resources. Alpha CPU Startup Boost is a separate path: `Off` does not disable a configured boost. Before removing its configuration or disabling its gate, let active boosts unboost or deliberately replace/resize those Pods; disabling the gate stops the updater's boost workers, so already boosted Pods are not automatically unboosted.

## Official Documentation

- [VPA updater flags and exact defaults](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md#what-are-the-parameters-to-vpa-updater)
- [VPA eviction restriction source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/restriction/pods_restriction_factory.go)
- [VPA updater rate-limiter source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/logic/updater.go)
- [VPA API update policy](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#podupdatepolicy)
- [VPA CPU Startup Boost enablement and rollback](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/enhancements/7862-cpu-startup-boost/README.md#feature-enablement-and-rollback)
- [Kubernetes Pod disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Configure a PodDisruptionBudget](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)

## Conclusion

Tune the updater from measured recovery time and an application availability target. Let PDBs express service safety, use VPA tolerance as an internal concurrency bound, use a positive process-wide rate to prevent fleet waves, and choose an interval that can drain the intended queue. Stage each change and judge it by completed healthy replacements, not merely eviction count.
