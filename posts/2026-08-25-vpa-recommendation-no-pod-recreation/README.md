# Why Did VPA Change Its Recommendation but Not Recreate the Pod? Understanding Bounds and Eviction Thresholds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Autoscaling, Pod Eviction, Troubleshooting

Description: Diagnose why a new VPA target does not immediately replace a running Pod by separating recommendation updates from updater eligibility, bounds, thresholds, and disruption controls.

---

A changed VPA recommendation is not an instruction to recreate a Pod immediately. The recommender writes `target`, `lowerBound`, `upperBound`, and `uncappedTarget` into VPA status. The updater independently decides whether a running Pod is eligible for an update, whether availability rules permit it, and whether the configured update mode can apply it.

## Verify the Update Mode First

```bash
kubectl -n payments get vpa checkout -o jsonpath='{.spec.updatePolicy.updateMode}{"\n"}'
kubectl -n payments get vpa checkout -o yaml
```

The current `autoscaling.k8s.io/v1` modes behave differently:

- `Off` computes recommendations and disables normal VPA actuation. The alpha CPU Startup Boost feature is independent: when it is configured on Kubernetes 1.33 or later with in-place Pod resize support, and `--feature-gates=CPUStartupBoost=true` is set on both the admission controller and updater, admission can still boost CPU and the updater can later unboost it in place.
- `Initial` applies a recommendation only when a Pod is created, except for the same CPU Startup Boost behavior.
- `Recreate` can evict a running Pod and relies on its controller to replace it.
- `InPlaceOrRecreate` tries the Pod `/resize` subresource first and can fall back to eviction.
- `InPlace` is alpha in VPA 1.7, requires Kubernetes 1.33 or later with `InPlacePodVerticalScaling` enabled and `--feature-gates=InPlace=true` on both the admission controller and updater, and never evicts.
- `Auto` is deprecated and is currently equivalent to `Recreate`.

If the mode is `Off` or `Initial`, a recommendation can change repeatedly without causing a running Pod to be replaced. The admission webhook defaults a completely omitted `updatePolicy` to `updateMode: Recreate`; when `updatePolicy` is present, `updateMode` is required. Use an explicit value so intent survives upgrades.

## Compare Requests with the Recommendation Range

Extract the desired Pod-spec requests, actual container requests, and recommendation:

```bash
kubectl -n payments get pod -l app=checkout \
  -o jsonpath='{range .items[*]}{.metadata.name}{" spec:"}{range .spec.containers[*]}{.name}{"="}{.resources.requests.cpu}{"/"}{.resources.requests.memory}{" "}{end}{" actual:"}{range .status.containerStatuses[*]}{.name}{"="}{.resources.requests.cpu}{"/"}{.resources.requests.memory}{" "}{end}{"\n"}{end}'

kubectl -n payments get vpa checkout \
  -o jsonpath='{range .status.recommendation.containerRecommendations[*]}{.containerName}{" target="}{.target}{" lower="}{.lowerBound}{" upper="}{.upperBound}{" uncapped="}{.uncappedTarget}{"\n"}{end}'
```

The Pod spec contains desired requests. During an in-place resize, the updater prefers actual requests from `status.containerStatuses[].resources` when they are available and otherwise falls back to the Pod spec.

`target` is the recommended request VPA aims to apply. The admission controller and updater post-process `target`, `lowerBound`, and `upperBound` for each Pod, including LimitRange and existing-limit constraints, so the effective values can differ from raw VPA status. `lowerBound` and `upperBound` form an updater range, not an error bar. The API describes the lower bound as a level below which performance or availability is likely to suffer, and the upper bound as a level beyond which allocation is likely wasted.

After that per-Pod processing, current upstream updater logic admits a Pod to the update queue without applying the age or minimum-difference checks when any controlled request is outside its corresponding lower or upper bound. Absent the separate quick-OOM path, when requests remain inside the range it waits until both of these defaults are satisfied:

- the Pod is at least 12 hours old (`--in-recommendation-bounds-eviction-lifetime-threshold=12h`); and
- the aggregate relative request-to-target difference has priority of at least `0.1` (`--pod-update-threshold=0.1`).

That `0.1` is not a universal “evict whenever one request changes by 10%” rule. For each controlled resource type, the updater first totals current requests and recommendations across eligible containers; it then sums the relative difference for each resource type. The threshold applies to that aggregate priority only for the long-lived, still-inside-bounds path. A Pod outside a bound is eligible without waiting 12 hours.

## Remember That Eligibility Is Not Permission

An eligible Pod can still remain untouched because the updater also checks:

- the global `--min-replicas` value, which defaults to 2, or `spec.updatePolicy.minReplicas` when set;
- VPA's replica-group eviction tolerance;
- for an eviction, any matching PodDisruptionBudget through the Eviction API;
- optional `evictionRequirements` that restrict scale-up or scale-down directions;
- a configured updater rate limiter (`--eviction-rate-limit`, disabled by default);
- whether the admission-controller status lease is healthy when `--use-admission-controller-status=true` (the default); and
- whether VPA can associate the Pod with a managing controller and replica group that can recreate it.

Inspect all of those signals together:

```bash
kubectl -n payments get pdb
kubectl -n payments get events --sort-by=.metadata.creationTimestamp | tail -n 40
kubectl -n kube-system logs deploy/vpa-updater --since=30m
kubectl -n kube-system get lease vpa-admission-controller -o yaml
```

Component names and namespaces vary by installation. Updater logs at the configured verbosity are particularly useful for messages such as “request within recommended range,” “resource diff too low,” “too few replicas,” and failed Eviction API calls.

## Use Directional Eviction Requirements Deliberately

For example, this policy permits VPA-triggered eviction and recreation only when the updater's processed target memory request is higher than the current request it observes:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: checkout
  namespace: payments
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout
  updatePolicy:
    updateMode: Recreate
    evictionRequirements:
      - resources: [memory]
        changeRequirement: TargetHigherThanRequests
```

Current updater source evaluates the full requirement list separately for each controlled container. Every requirement must pass for that container; within one requirement containing several resources, at least one resource must satisfy the requested direction. The Pod is admitted when at least one controlled container passes. A controlled container with either its CPU or memory request missing is admitted without evaluating the directions.

Despite the field's eviction-oriented name, the current updater sends both eviction and in-place candidates through this admission filter. `evictionRequirements` therefore also gate current in-place update attempts. They do not stop the recommender from publishing a target in the disallowed direction.

## Official Documentation

- [Kubernetes Vertical Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/)
- [VPA API reference](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md)
- [VPA component flags and defaults](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md)
- [VPA updater priority calculation source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/priority/priority_processor.go)
- [VPA scaling-direction admission source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/priority/scaling_direction_pod_eviction_admission.go)
- [VPA updater candidate ordering source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/logic/updater.go)
- [VPA CPU Startup Boost AEP](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/enhancements/7862-cpu-startup-boost/README.md)
- [Kubernetes disruptions and PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)

## Conclusion

Treat VPA status and Pod replacement as two stages. Confirm the update mode, compare current requests with both bounds, account for the 12-hour and priority thresholds when requests remain inside the range, and then inspect replica, PDB, rate, lease, and ownership restrictions. A fresh target proves that recommendation works; it does not by itself prove that recreation is due or safe.
