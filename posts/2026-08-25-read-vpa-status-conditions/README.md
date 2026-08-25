# How to Read VPA RecommendationProvided, NoPodsMatched, and LowConfidence Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Status Conditions, Troubleshooting, Observability

Description: Interpret VPA conditions with their status, reason, generation, and recommendation fields, including current upstream behavior for historical LowConfidence entries.

---

VPA conditions describe different facts and are not mutually exclusive. Read each condition's `type`, `status`, `reason`, `message`, and `lastTransitionTime`, then inspect `.status.recommendation` and the top-level `.status.observedGeneration`. A condition name alone is not enough.

## Print a Useful Status View

```bash
kubectl get vpa -A -o json | jq -r '
  .items[] |
  [.metadata.namespace,
   .metadata.name,
   (.metadata.generation|tostring),
   (.status.observedGeneration // "<unset>" | tostring),
   ([.status.conditions[]? | "\(.type)=\(.status):\(.reason // "")"] | join(",")),
   ([.status.recommendation.containerRecommendations[]?.containerName] | join(","))]
  | @tsv'
```

For one object:

```bash
kubectl -n storefront get vpa catalog -o yaml
kubectl -n storefront describe vpa catalog
```

The top-level status `observedGeneration` is optional, although the current default recommender populates it. When it is present, compare it with metadata `generation`. If status is behind, the recommender has not yet reported against the latest spec; if it is unset, do not treat it as generation zero. The API also defines an optional `observedGeneration` on each condition, but the current default recommender's condition builder leaves it unset. A custom recommender or another version may populate it; use the condition-level value only when it is actually present.

## `RecommendationProvided`

The API type means the recommender was able to calculate a recommendation.

- `True` means `.status.recommendation.containerRecommendations` has at least one entry. It does not mean the updater applied it, the admission webhook is healthy, or a Pod was resized.
- `False` means there is no current container recommendation, even though `.status.recommendation` may serialize as an empty object. If Pods match, investigate resource metrics, history, excluded containers, and recommender selection.
- If the condition is absent, avoid assuming either state; inspect VPA/recommender version and status age.

Current default recommender logic sets `RecommendationProvided=True` whenever it has at least one container recommendation. It can remain true while `NoPodsMatched=True` if historical state still provides a recommendation. That combination is valid and should not be flattened into one “healthy” boolean.

## `NoPodsMatched`

`NoPodsMatched=True` means the default recommender's tracked matching-Pod count is zero. Its Pod watch excludes `Pending` Pods, while retained `Succeeded` or `Failed` Pods still count until they are deleted. Current upstream reason and message are `NoPodsMatched` and `No pods match this VPA object`.

Check the target and its authoritative selector, replacing the Deployment kind and name below if the reported target differs:

```bash
kubectl -n storefront get vpa catalog \
  -o jsonpath='{.spec.targetRef.apiVersion}{" "}{.spec.targetRef.kind}{" "}{.spec.targetRef.name}{"\n"}'
kubectl -n storefront get deployment catalog -o yaml
kubectl -n storefront get pods \
  --field-selector='status.phase!=Pending' --show-labels
```

This condition can be expected when a CronJob has no retained non-Pending Pod or a workload intentionally scales to zero. A completed CronJob Pod that has not been deleted can keep the condition absent even when no Pod is active. Alert only when the workload should have running Pods, or combine it with target desired replicas and schedule state.

When the tracked matching-Pod count becomes positive, the current recommender deletes the active `NoPodsMatched` condition instead of retaining it with `False`. Dashboards must handle both absent and false representations.

## `LowConfidence`

The VPA API declares `LowConfidence` to indicate low confidence in the recommendation for one or more containers. However, as of current upstream master and VPA 1.7.1 source, the default recommender declares this condition type but does not contain logic that sets it.

If `LowConfidence` appears, identify the producer and version:

```bash
kubectl -n kube-system get deploy vpa-recommender \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl -n storefront get vpa catalog \
  -o jsonpath='{.spec.recommenders}{"\n"}'
```

It may come from a custom or vendor-modified recommender, or from status retained after another producer wrote it. Use its reason, message, transition time, and any observed generation rather than inventing a numeric confidence threshold. Current default recommendation bounds themselves widen with short history through confidence multipliers, so a large lower-to-upper range can be a sparse-history signal even without `LowConfidence`; confirm it with sample history because usage percentiles and policy bounds also affect the range.

## Read Related Conditions

The current API also declares:

- `FetchingHistory`: the recommender is loading additional history samples;
- `ConfigDeprecated`: configuration still works but will stop being supported; and
- `ConfigUnsupported`: recommendations will not be provided for this configuration.

`ConfigUnsupported` deserves priority over metrics debugging. It commonly identifies a missing or unreadable targetRef, a target that cannot be resolved to a well-known or scalable controller, an indirect/non-topmost controller target, or another invalid configuration. Read its message.

The API also declares `FetchingHistory` for a recommender that is loading additional samples. Current upstream default-recommender source declares and checks this condition but contains no path that sets it, so do not depend on seeing it during startup. If another producer does set `FetchingHistory=True`, the checkpoint writer skips that VPA while the condition is active so incomplete in-memory state is not checkpointed while history is loading.

## Build Alerts Around Actions

Useful conditions include context:

- `RecommendationProvided != True` for longer than a normal recommender and metrics warm-up, while desired replicas are above zero;
- `NoPodsMatched=True` while the target has available replicas;
- `ConfigUnsupported=True` immediately;
- VPA status generation behind metadata generation for several loops, when the status field is populated; and
- recommendation bounds or target absent for a required container.

Export conditions and recommendations separately. A recommendation metric going absent must not be interpreted as zero CPU or memory.

## Official Documentation

- [VPA API status and condition fields](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#verticalpodautoscalercondition)
- [VPA condition type source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go)
- [Current default recommender condition logic](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/model/vpa.go)
- [VPA checkpoint writer handling for FetchingHistory](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/checkpoint/checkpoint_writer.go)
- [VPA target validation source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/input/cluster_feeder.go)
- [Kubernetes API conventions for conditions](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md#typical-status-properties)

## Conclusion

`RecommendationProvided` answers whether at least one container recommendation exists, `NoPodsMatched` answers whether the default recommender tracks any matching non-Pending Pods, and `LowConfidence` is a declared condition that the current default recommender does not set. Preserve status, reason, message, and generation, allow valid condition combinations, and use recommendation width plus history evidence when assessing current confidence.
