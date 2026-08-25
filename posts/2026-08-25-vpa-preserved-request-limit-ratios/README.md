# Why VPA Multiplies Resource Limits When Requests Rise: Preserved Request-to-Limit Ratios Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Resource Limits, Resource Requests, Capacity Planning

Description: Explain VPA's default proportional limit scaling, show the request-to-limit calculation, and control its effects with RequestsOnly, bounds, and namespace policy.

---

When VPA controls both requests and limits, it preserves the container's existing limit-to-request ratio for each resource. That is why a larger recommended request can produce a much larger limit even though VPA status primarily presents recommended requests.

## Follow the Ratio with Numbers

Assume the Pod template contains:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: "1"
    memory: 2Gi
```

Both ratios are 2:1. If VPA applies target requests of `1` CPU and `2Gi` memory, it preserves those ratios and produces limits of approximately `2` CPU and `4Gi` memory.

Conceptually, for a resource with both an original request and limit:

```text
new limit = new request × (old limit / old request)
```

The official VPA example specifically shows a memory request rising from 1 GB to 2 GB while its 2 GB limit becomes 4 GB. This is expected default behavior, not a second recommendation algorithm.

## Confirm the Controlling Policy

The API default is `RequestsAndLimits`:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: encoder
  namespace: media
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: encoder
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: app
        controlledResources: [cpu, memory]
        controlledValues: RequestsAndLimits
```

Inspect template, live Pod, and VPA side by side:

```bash
kubectl -n media get deploy encoder -o json | jq '.spec.template.spec.containers[] | {name, resources}'
kubectl -n media get pod -l app=encoder -o json | jq '.items[].spec.containers[] | {name, resources}'
kubectl -n media get vpa encoder -o yaml
```

With `Off` as shown, the recommender populates VPA status but does not apply its resource recommendations to Pods. In an applying mode such as `Initial` or `Recreate`, the workload template usually retains the declared values while the VPA admission webhook mutates newly created Pods. Therefore, when updates are enabled, compare a live Pod, not only the Deployment template.

## Preserve Limits Instead When Appropriate

Switch the relevant container policy to:

```yaml
controlledValues: RequestsOnly
```

When recommendations are applied, VPA will then adjust requests and leave limits as admitted from the template or another policy. This is often preferable for a deliberate memory ceiling, but it changes the request-to-limit headroom and can interact with QoS and LimitRange ratios.

You can also control only one resource:

```yaml
controlledResources: [memory]
controlledValues: RequestsOnly
```

CPU is then outside VPA control, and the existing CPU request and limit remain unchanged.

## Bound Requests with the Resulting Limit in Mind

`minAllowed` and `maxAllowed` constrain the recommendation for requests. With `RequestsAndLimits`, the proportional limit follows the bounded request. If a container has a 4:1 memory limit-to-request ratio and `maxAllowed.memory: 8Gi`, the resulting limit can approach 32 GiB.

```yaml
resourcePolicy:
  containerPolicies:
    - containerName: app
      maxAllowed:
        cpu: "4"
        memory: 8Gi
      controlledValues: RequestsAndLimits
```

Capacity review must therefore include both outcomes:

- the request affects scheduling, quota, and node autoscaling;
- the limit affects cgroup enforcement, limit quota, LimitRange validation, and possible memory consumption.

`uncappedTarget` is useful for seeing when request policy clips usage-based demand, but it does not display a separate uncapped limit. Calculate the preserved ratio from the original container resources.

## Check LimitRange and ResourceQuota Before Recreation

VPA post-processes recommendations against CPU and memory minimum and maximum constraints in `Container`- and `Pod`-type LimitRanges. It does not currently account for `maxLimitRequestRatio`, which the API server still enforces. When an explicit VPA resource policy conflicts with a LimitRange minimum or maximum, VPA policy wins, and the API server may reject the resulting Pod.

```bash
kubectl -n media get limitrange,resourcequota -o yaml
kubectl -n media describe resourcequota
kubectl -n media events | tail -n 50
```

Pay particular attention to:

- per-container maximum limits;
- `maxLimitRequestRatio` rules;
- namespace `requests.cpu`, `requests.memory`, `limits.cpu`, and `limits.memory` quotas; and
- Pod-level `.spec.resources` requests and limits, which current upstream VPA does not support.

An updater eviction followed by an admission rejection can leave a replacement missing. Server-side dry-run a representative Pod manifest containing the calculated requests and limits in the target namespace, then use a canary before enabling `Recreate`.

## Consider In-Place Resize Constraints

Proportional changes may update request and limit simultaneously. An in-place resize cannot change the Pod's original QoS class. Memory-limit decreases have version- and `resizePolicy`-dependent behavior, while a request increase can be deferred or infeasible on a node without capacity. `InPlaceOrRecreate` can eventually fall back to eviction; the alpha `InPlace` mode in VPA 1.7+ (with the VPA `InPlace` feature gate enabled) does not. Both modes require Kubernetes in-place Pod resize support.

## Official Documentation

- [VPA example: keeping limits proportional to requests](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/examples.md#keeping-limit-proportional-to-request)
- [VPA feature documentation: limits control](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md#limits-control)
- [VPA API: controlledValues](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#containercontrolledvalues)
- [Kubernetes resource requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes LimitRanges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes ResourceQuotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)

## Conclusion

VPA multiplies limits because `RequestsAndLimits` preserves the original per-resource ratio. Model the resulting limit before setting request bounds, and verify namespace policy and quota. When the limit is an independently chosen safety boundary, use `RequestsOnly` and monitor the changing headroom explicitly.
