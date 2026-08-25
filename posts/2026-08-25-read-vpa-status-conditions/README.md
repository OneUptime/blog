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
   (.status.observedGeneration // 0 | tostring),
   ([.status.conditions[]? | "\(.type)=\(.status):\(.reason // "")"] | join(",")),
   ([.status.recommendation.containerRecommendations[]?.containerName] | join(","))]
  | @tsv'
```

For one object:

```bash
kubectl -n storefront get vpa catalog -o yaml
kubectl -n storefront describe vpa catalog
```

Compare status `observedGeneration` with metadata `generation`. If status is behind, the recommender has not yet reported against the latest spec. The API also defines an optional `observedGeneration` on each condition, but the current default recommender's condition builder leaves it unset. A custom recommender or another version may populate it; use the condition-level value only when it is actually present.

## `RecommendationProvided`

The API type means the recommender was able to calculate a recommendation.

- `True` means `.status.recommendation` exists. It does not mean the updater applied it, the admission webhook is healthy, or a Pod was resized.
- `False` means there is no current recommendation. If Pods match, investigate resource metrics, history, excluded containers, and recommender selection.
- If the condition is absent, avoid assuming either state; inspect VPA/recommender version and status age.

Current default recommender logic sets `RecommendationProvided=True` whenever it retains a recommendation. It can remain true while `NoPodsMatched=True` if historical state still provides a recommendation. That combination is valid and should not be flattened into one “healthy” boolean.

## `NoPodsMatched`

`NoPodsMatched=True` means the target selector currently matches no Pods. Current upstream reason and message are `NoPodsMatched` and `No pods match this VPA object`.

Check the target and its authoritative selector:

```bash
kubectl -n storefront get vpa catalog \
  -o jsonpath='{.spec.targetRef.apiVersion}{" "}{.spec.targetRef.kind}{" "}{.spec.targetRef.name}{"\n"}'
kubectl -n storefront get deployment catalog -o yaml
kubectl -n storefront get pods --show-labels
```

This condition can be expected when a CronJob has no active Pod or a workload intentionally scales to zero. Alert only when the workload should have running Pods, or combine it with target desired replicas and schedule state.

When Pods match again, the current recommender deletes the active `NoPodsMatched` condition instead of retaining it with `False`. Dashboards must handle both absent and false representations.

## `LowConfidence`

The VPA API declares `LowConfidence` to indicate low confidence in the recommendation for one or more containers. However, as of current upstream master and VPA 1.7.1 source, the default recommender declares this condition type but does not contain logic that sets it.

If `LowConfidence` appears, identify the producer and version:

```bash
kubectl -n kube-system get deploy vpa-recommender \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl -n storefront get vpa catalog \
  -o jsonpath='{.spec.recommenders}{"\n"}'
```

It may come from an older release, a custom recommender, or retained status. Use its reason, message, transition time, and generation rather than inventing a numeric confidence threshold. Current default recommendation bounds themselves widen with short history through confidence multipliers, so a large lower-to-upper range is the practical sparse-history signal even without `LowConfidence`.

## Read Related Conditions

The current API also declares:

- `FetchingHistory`: the recommender is loading additional history samples;
- `ConfigDeprecated`: configuration still works but will stop being supported; and
- `ConfigUnsupported`: recommendations will not be provided for this configuration.

`ConfigUnsupported` deserves priority over metrics debugging. It commonly identifies an unreadable targetRef, an indirect/non-topmost controller target, an unsupported API version, or another invalid configuration. Read its message.

The API also declares `FetchingHistory` for a recommender that is loading additional samples. Current upstream default-recommender source declares and checks this condition but contains no path that sets it, so do not depend on seeing it during startup. If another recommender or version does set `FetchingHistory=True`, the checkpoint writer skips that VPA while the condition is active so thin state does not overwrite restored history.

## Build Alerts Around Actions

Useful conditions include context:

- `RecommendationProvided != True` for longer than a normal recommender and metrics warm-up, while desired replicas are above zero;
- `NoPodsMatched=True` while the target has available replicas;
- `ConfigUnsupported=True` immediately;
- VPA status generation behind metadata generation for several loops; and
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

`RecommendationProvided` answers whether a recommendation exists, `NoPodsMatched` answers whether the target currently selects Pods, and `LowConfidence` is a declared condition that the current default recommender does not set. Preserve status, reason, message, and generation, allow valid condition combinations, and use recommendation width plus history evidence when assessing current confidence.
