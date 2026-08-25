# How LimitRanges and ResourceQuotas Alter—or Reject—VPA Recommendations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, LimitRange, ResourceQuota, Admission Control

Description: Predict how namespace limits, defaults, ratios, and quota interact with VPA mutation so recommendations remain valid and replacement Pods are not rejected after eviction.

---

VPA can recommend and apply a resource shape that later meets another admission decision. `LimitRange` applies defaults and validates per-object minima, maxima, and limit-to-request ratios. `ResourceQuota` validates aggregate namespace consumption. A VPA status target can exist even when the next mutated Pod would be rejected by one of those policies.

## Map the Admission Path

For a `Recreate` update:

1. the updater evicts an eligible Pod;
2. its workload controller submits a replacement Pod;
3. the admission chain runs VPA mutation together with configured defaulting and other mutators;
4. LimitRange and ResourceQuota validation evaluate the admitted resource shape; and
5. only an admitted Pod reaches scheduling.

Do not assume one universal order among mutating admission plugins and webhooks: that chain depends on API-server configuration. The important result is that the final Pod must satisfy every applicable LimitRange rule and quota check. Upstream VPA warns that it cannot guarantee successful recreation after eviction; a policy rejection after the old Pod is gone can turn rightsizing into an outage.

## Inventory Every Namespace Constraint

```bash
kubectl -n payments get limitrange -o yaml
kubectl -n payments get resourcequota -o yaml
kubectl -n payments describe resourcequota
kubectl -n payments events | tail -n 60
```

A compute `LimitRange` can:

- inject default requests and limits when a container omits them;
- require per-container or per-Pod minimum and maximum CPU or memory;
- enforce `maxLimitRequestRatio`; and
- reject a Pod with HTTP `403 Forbidden` when the final values violate a constraint.

Validation occurs at Pod admission. Changing a LimitRange does not rewrite an existing running Pod, which is why a current Pod can run while its VPA-mutated replacement is invalid.

A compute ResourceQuota can constrain totals such as `requests.cpu`, `requests.memory`, `limits.cpu`, and `limits.memory`. It can also require every incoming container to specify the corresponding request or limit. Quota usage is dynamic, so rollout overlap or another team's Pod can consume headroom between observation and recreation.

## Align VPA Policy with LimitRange

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
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: app
        controlledValues: RequestsOnly
        minAllowed:
          cpu: 250m
          memory: 512Mi
        maxAllowed:
          cpu: "2"
          memory: 4Gi
```

Choose `minAllowed` and `maxAllowed` inside the LimitRange envelope. The VPA features documentation states that VPA tries to cap recommendations between LimitRange minimum and maximum. If a VPA resource policy conflicts, VPA policy wins and can set values outside the LimitRange; admission can then reject the Pod. Resolve the conflict instead of relying on one controller's ordering.

With default `RequestsAndLimits`, VPA preserves the original limit-to-request ratio. For a non-conflicting LimitRange, VPA normally adjusts the request so the proportional limit fits the maximum. A conflicting VPA policy can override that cap and produce a limit above `max.memory`; even a valid proportional limit can consume `limits.memory` quota. With `RequestsOnly`, a fixed limit and changing request can violate `maxLimitRequestRatio`. Model both fields.

## Include the `/resize` Admission Path

An in-place resize is also an API admission request; it does not bypass namespace policy. LimitRanger applies the Pod LimitRange checks, including applicable minimum, maximum, and `maxLimitRequestRatio` constraints, to a Pod `/resize` request. For request quota, ResourceQuota accounts for pending resizes using the maximum of desired requests (except when the resize is marked `Infeasible`), actual requests, and allocated requests. For limit quota, it similarly uses the maximum of desired and actual limits, omitting desired limits when the resize is `Infeasible`. This prevents a requested scale-down from releasing quota before kubelet has actually applied it.

If LimitRange or ResourceQuota rejects the `/resize` patch, the update is not persisted and kubelet never sees it. VPA 1.7.1 handles that error differently by mode:

- alpha `InPlace` logs the failure and increments its failed-update metric but remains eviction-free; ordinary LimitRange and ResourceQuota rejections are not cached as infeasible and may be retried on later reconciliations; and
- `InPlaceOrRecreate` records the same failure metric and adds the Pod to the fallback-eviction candidates, subject to normal eviction checks.

Fallback is not a policy escape hatch. The replacement Pod can be rejected by the same LimitRange or quota constraint after the old Pod is evicted. Pretest both the candidate resource shape and quota headroom before enabling a fallback-capable mode.

## Budget Quota for the Peak Concurrent Shape

For each hard quota key and each rollout or recreation scenario, calculate:

```text
observed namespace usage for that key
+ candidate Pod usage not yet included in observed usage
+ other expected concurrent additions for that key
+ operational reserve for that key
<= hard quota for that key
```

An eviction starts deletion before the controller creates a replacement, but graceful termination means the old Pod can still exist and count toward quota when the replacement is admitted. Surge rollouts, other controllers, and concurrent VPA actions can add more overlap. Do not set quota equal to steady-state arithmetic with zero margin.

Alert on quota utilization and admission failures:

```bash
kubectl -n payments get resourcequota -o json | jq \
  '.items[] | {name: .metadata.name, hard: .status.hard, used: .status.used}'
kubectl -n payments get events --field-selector reason=FailedCreate
```

Controller events often contain the exact exceeded quota or LimitRange rule. The absence of a Pending Pod does not mean scheduling succeeded; admission rejection means no Pod object was created.

## Test the Mutated Pod Server-Side

Keep VPA in `Off` while reviewing status. Build a representative Pod manifest using the candidate target, the preserved or proportional limits, every sidecar, and final labels. Submit it to the real namespace:

```bash
kubectl create --dry-run=server -n payments -f checkout-candidate-pod.yaml -o yaml
```

Server-side dry-run invokes admission webhooks that declare dry-run-safe side effects and evaluates built-in policy without persisting the Pod. Confirm the returned resources, then use a canary creation to test quota timing and scheduling.

Dry-running a Deployment only validates the Deployment request; it does not necessarily create and admit a child Pod. Test a Pod-shaped object when the failure risk is Pod admission.

## Watch for Pod-Level Resource Conflicts

Current upstream VPA documents workloads with Pod-level `spec.resources` as unsupported. A container recommendation can exceed the Pod-level request or limit envelope and cause creation failure. Do not combine those features until the deployed VPA version explicitly supports them.

## Official Documentation

- [VPA limits control](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md#limits-control)
- [VPA resource policy API](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#containerresourcepolicy)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA Pod-level resource incompatibility](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/README.md#features-and-known-limitations)
- [VPA updater fallback handling after an in-place patch error](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/logic/updater.go)
- [Kubernetes in-place Pod resize KEP: Resource Quota and affected admission controllers](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/1287-in-place-update-pod-resources/README.md#resource-quota)
- [Kubernetes LimitRanges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes ResourceQuotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)

## Conclusion

Treat a VPA recommendation as one input to admission, not a guarantee of a valid Pod. Align per-container bounds with LimitRange rules, calculate both requests and limits, reserve aggregate quota for concurrency, and dry-run the final Pod in its namespace. Perform these checks before updater eviction exposes a policy conflict.
