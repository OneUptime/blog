# How to Exclude Sidecars from VPA or Manage CPU and Memory Per Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Sidecars, Container Policies, Resource Management

Description: Use named and wildcard VPA container policies to exclude sidecars or control CPU, memory, requests, limits, and bounds independently for each regular container.

---

VPA computes and applies recommendations per container. Use `spec.resourcePolicy.containerPolicies` to exclude an injected sidecar, manage only one resource for it, preserve its limits, or give the main application different bounds.

## Exclude a Regular Sidecar by Exact Name

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: orders
  namespace: commerce
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: orders
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: istio-proxy
        mode: "Off"
      - containerName: "*"
        mode: Auto
        controlledResources: [cpu, memory]
        controlledValues: RequestsOnly
        minAllowed:
          cpu: 100m
          memory: 256Mi
        maxAllowed:
          cpu: "4"
          memory: 8Gi
```

`mode: "Off"` disables recommendations for that container. The VPA API intentionally omits containers in `Off` mode from `.status.recommendation.containerRecommendations`; an absent sidecar recommendation is therefore expected.

The wildcard applies only to containers without a named policy. There can be at most one policy for each name and one `containerName: "*"` entry.

## Manage Resources Independently

This example lets VPA control memory requests for the application and CPU requests for a telemetry sidecar:

```yaml
resourcePolicy:
  containerPolicies:
    - containerName: app
      controlledResources: [memory]
      controlledValues: RequestsOnly
      minAllowed:
        memory: 1Gi
      maxAllowed:
        memory: 12Gi
    - containerName: otel-agent
      controlledResources: [cpu]
      controlledValues: RequestsOnly
      minAllowed:
        cpu: 50m
      maxAllowed:
        cpu: 500m
```

If `controlledResources` is omitted, VPA controls CPU and memory. If `controlledValues` is omitted, the default is `RequestsAndLimits`, so an existing limit is scaled proportionally with the request. Be explicit when sidecar limits are owned by a platform team or injector.

## Discover the Names That Admission Actually Created

Sidecars are often injected after the Deployment manifest is submitted. Policies match the final Pod container name, case-sensitively:

```bash
kubectl -n commerce get pod -l app=orders \
  -o jsonpath='{range .items[0].spec.containers[*]}{.name}{"\n"}{end}'
kubectl -n commerce get vpa orders \
  -o jsonpath='{range .status.recommendation.containerRecommendations[*]}{.containerName}{" "}{.target}{"\n"}{end}'
```

Check injector upgrades for name changes. A wildcard can unintentionally start managing a newly injected container, while a stale named `Off` policy simply matches nothing. Admission webhook interactions are an explicit upstream VPA limitation; test the final mutated Pod whenever another webhook changes resources.

## Treat Native Sidecars Differently

Kubernetes native sidecars are restartable init containers under `.spec.initContainers`, not regular entries in `.spec.containers`. Current upstream VPA records init-container names in its internal Pod state and deliberately drops their real-time metric samples. Its admission controller and updater currently operate only on regular containers in `.spec.containers`.

Therefore, do not assume a `containerPolicies` entry will right-size a restartable init sidecar. Give native sidecars explicit static requests and limits, verify behavior against the VPA version you deploy, and monitor upstream support. The named policy examples above apply to conventional sidecars represented as regular containers.

## Include Excluded Sidecars in Scheduling Math

Excluding a sidecar from VPA does not remove its resources from the Pod. The scheduler considers the Pod's effective requests, including regular containers, restartable init sidecars, init-container peaks, and Pod overhead. When setting `maxAllowed` for the main container, account for the complete effective Pod request. Inspect the final Pod's inputs to that calculation:

```bash
kubectl -n commerce get pod -l app=orders -o json | jq '
  .items[] |
  {
    containers: [
      .spec.containers[] |
      {name, cpu: .resources.requests.cpu, memory: .resources.requests.memory}
    ],
    initContainers: [
      (.spec.initContainers // [])[] |
      {name, restartPolicy, cpu: .resources.requests.cpu, memory: .resources.requests.memory}
    ],
    overhead: (.spec.overhead // {})
  }'
```

A common failure is to cap the application at the largest-node envelope and then add an excluded proxy on top, producing a Pod that cannot fit.

## Coordinate with HPA and QoS

VPA should not manage the same CPU or memory resource metric used by HPA for that workload. A valid division is CPU-based HPA plus memory-only VPA, including explicit policies for every regular sidecar. Remember that HPA resource utilization is calculated against requests, so even a sidecar request change can affect a container-resource HPA metric targeting that sidecar.

Requests-only per-container changes can also change the QoS shape of newly created Pods. In-place resize cannot change an existing Pod's QoS class. Review the complete Pod, not a container in isolation.

## Roll Out Safely

Keep `updateMode: "Off"` while validating:

- every final regular container has the intended named or wildcard policy;
- excluded containers retain explicit resources;
- the Pod's effective requests, including init containers and overhead, fit an available node;
- LimitRange and quota accept the combined request and limit values; and
- another admission webhook does not overwrite VPA's mutation.

Then choose `Initial`, `Recreate`, or a supported in-place mode based on acceptable disruption.

## Official Documentation

- [VPA API: PodResourcePolicy and ContainerResourcePolicy](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#podresourcepolicy)
- [VPA features: disabling an individual container](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md#limits-control)
- [VPA FAQ: controlledResources](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#how-can-i-configure-vpa-to-manage-only-specific-resources)
- [VPA recommender source that skips init-container samples](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/input/cluster_feeder.go)
- [Kubernetes sidecar containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes Pod resource aggregation](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

## Conclusion

Use exact named policies for exceptions and a wildcard only for the default behavior you truly want. `mode`, `controlledResources`, `controlledValues`, and bounds solve different problems. Validate final injected container names, account for excluded sidecars in Pod capacity, and treat restartable init sidecars as a separate case that current upstream VPA does not right-size.
