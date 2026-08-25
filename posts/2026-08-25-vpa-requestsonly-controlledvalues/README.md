# How to Keep VPA from Changing Container Limits with controlledValues: RequestsOnly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Resource Requests, Resource Limits, Configuration

Description: Configure VPA to right-size CPU and memory requests while preserving container limits, with practical policies and caveats for QoS, LimitRanges, HPA, and in-place resize.

---

Set `controlledValues: RequestsOnly` in each applicable VPA container policy when VPA should change requests but leave limits alone. Without it, the default is `RequestsAndLimits`, and VPA scales an existing limit proportionally with its request.

## Configure Requests-Only Control

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api
  namespace: platform
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: app
        controlledResources: [cpu, memory]
        controlledValues: RequestsOnly
        minAllowed:
          cpu: 200m
          memory: 512Mi
        maxAllowed:
          cpu: "4"
          memory: 8Gi
```

Start with `Off` to inspect the result. When the target is acceptable, choose `Initial`, `Recreate`, or a supported in-place mode according to the workload's disruption requirements.

`controlledResources` answers which resource types VPA recommends; `controlledValues` answers whether it updates only requests or requests plus limits. They are independent fields. For example, memory-only requests control is:

```yaml
controlledResources: [memory]
controlledValues: RequestsOnly
```

## Apply It to Every Intended Container

A wildcard policy covers containers without a more specific entry:

```yaml
resourcePolicy:
  containerPolicies:
    - containerName: "*"
      controlledValues: RequestsOnly
    - containerName: envoy
      mode: "Off"
```

There can be one entry per named container and one wildcard. A named policy overrides the wildcard for that container. `mode: "Off"` removes that container from recommendations entirely; it is not the same as preserving limits while recommending requests.

After a new or recreated Pod is admitted, verify both fields:

```bash
kubectl -n platform get pod -l app=api -o json | jq \
  '.items[].spec.containers[] | {name, requests: .resources.requests, limits: .resources.limits}'
kubectl -n platform get vpa api -o yaml
```

The applied requests should reflect the VPA recommendation after policy processing and any capping for existing container limits or `LimitRange` minimum and maximum values. With `RequestsOnly`, a recommendation above an existing container limit is capped to that limit, so the applied request can be lower than the target shown in VPA status. Limits should retain the values that admission produced from the workload template and any other mutating policy.

## Understand the QoS Consequence

Kubernetes derives Pod QoS from CPU and memory request and limit relationships. For the container-level resource model that VPA currently supports:

- a `Guaranteed` Pod has nonzero CPU and memory requests and limits for every container, with each request equal to its corresponding limit;
- a Pod that is not `Guaranteed` and has at least one CPU or memory request or limit in a container is `Burstable`;
- a Pod with no CPU or memory requests or limits in any container is `BestEffort`.

If VPA changes only requests on newly created Pods, the resulting QoS can differ from the unmutated template. For a running Pod, in-place resize cannot change its original QoS class. A requests-only change that would break request-equals-limit on a `Guaranteed` Pod must be recreated or redesigned; it cannot be applied in place merely because limits stay fixed.

Inspect the class explicitly:

```bash
kubectl -n platform get pod -l app=api \
  -o custom-columns=NAME:.metadata.name,QOS:.status.qosClass
```

## Account for LimitRange Defaults and Ratios

`RequestsOnly` means VPA does not mutate limits. It does not disable Kubernetes admission policy. A namespace `LimitRange` can inject a default limit into each container that omitted one, and can reject a request that violates minimum, maximum, or max-limit-to-request ratio constraints.

```bash
kubectl -n platform get limitrange -o yaml
kubectl -n platform get resourcequota -o yaml
```

Suppose the preserved CPU limit is `1` and VPA raises the request to `800m`. A `maxLimitRequestRatio.cpu: 1` would reject that Pod because limit and request are unequal. Conversely, a high fixed limit plus a low VPA request can violate a maximum ratio. Align `minAllowed` and `maxAllowed` with the full namespace policy.

ResourceQuota evaluates the resulting request and limit totals. A higher request can exhaust `requests.cpu` or `requests.memory` even though no limit changed.

## Avoid Autoscaler Feedback Loops

HPA resource utilization is usage divided by request. If VPA changes the same CPU or memory request used by HPA, it changes the HPA signal even with `RequestsOnly`. Upstream VPA warns against VPA and HPA controlling the same resource metric. A common safe split is VPA managing memory requests while HPA scales on CPU, or HPA using custom/external metrics independent of VPA-managed requests.

## Decide Whether Fixed Limits Are Actually Safe

Preserving limits is useful when:

- a hard memory ceiling is tied to application configuration;
- CPU limits follow an organizational policy independent of scheduling requests;
- limit changes would trigger unsafe memory downscaling; or
- a team wants recommendation-driven scheduling without automatic limit expansion.

It also creates responsibility. A memory request can rise toward a fixed limit until little burst headroom remains. A request can even equal the limit on a newly created container, changing QoS relationships. Alert on request-to-limit headroom and OOMKills, and choose bounds that keep the fixed limit meaningful.

## Official Documentation

- [VPA API: ContainerControlledValues](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#containercontrolledvalues)
- [VPA FAQ: controlled resources](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#how-can-i-configure-vpa-to-manage-only-specific-resources)
- [Kubernetes resource requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Pod Quality of Service](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Kubernetes LimitRanges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [VPA known limitation with HPA resource metrics](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)

## Conclusion

`RequestsOnly` is the precise switch for request rightsizing without VPA limit scaling. Apply it per container, bound the recommendation, and then verify QoS, LimitRange ratios, quota headroom, and HPA interactions. Fixed limits remove one VPA behavior; they do not remove the operational consequences of changing requests beneath those limits.
