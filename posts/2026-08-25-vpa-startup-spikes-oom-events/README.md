# How to Account for Startup Spikes and OOM Events in VPA Memory Recommendations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, OOMKilled, Startup Performance, Memory Management

Description: Make VPA sizing resilient to startup CPU bursts and memory OOMs by understanding sampled peaks, OOM bump-up, conservative bounds, and VPA 1.7's alpha CPU Startup Boost.

---

Startup demand is easy to under-sample. A brief CPU burst can fall between resource-metrics scrapes, and a process can hit its memory limit before a normal sample captures the peak. VPA combines sampled usage history with observed OOM events, but upstream explicitly says it reacts to most—not all—OOM situations. Protect startup with policy as well as learned history.

## Understand the Default Signals

The recommender fetches fresh resource metrics every minute by default. Its default target percentiles are 0.9 for CPU and memory, with a 15% recommendation margin. CPU samples use a decaying histogram with a 24-hour half-life.

Memory is treated as peaks rather than an average. Current defaults aggregate one peak per 24-hour interval across eight intervals, with a 24-hour decay half-life. These implementation defaults can change, and VPA 1.7's alpha `PerVPAConfig` feature can override memory aggregation fields per policy.

```bash
kubectl -n apps get vpa jvm-api -o yaml
kubectl -n kube-system get deploy vpa-recommender -o yaml
kubectl -n kube-system logs deploy/vpa-recommender --since=30m
```

Compare recommendation history with container restart reason, startup duration, working set, and request/limit—not just a single `kubectl top` snapshot.

## Know What an OOM Adds

When current upstream VPA observes an applicable OOM event, it takes the greater of the container's memory request and its recent usage-based memory peak, then creates an OOM memory sample of:

```text
max(memory basis + oom minimum bump, memory basis × oom bump ratio)
```

The global defaults are:

```text
--oom-bump-up-ratio=1.2
--oom-min-bump-up-bytes=104857600
```

That is a 20% increase or at least 100 MiB, whichever is larger. The source deliberately avoids compounding the previous synthetic OOM peak when calculating a later one.

An OOM sample influences the decaying memory histogram; it does not directly set the final target forever. Check `uncappedTarget` to see usage-driven demand before `minAllowed` or `maxAllowed` clipping.

VPA's updater also has “quick OOM” logic. A controlled container whose last termination is `OOMKilled` and whose run lasted less than the default `--evict-after-oom-threshold=10m` can become update-eligible without waiting for ordinary bounds/age rules, provided applying the recommendation would actually change resources.

## Set Conservative Memory Policy

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: jvm-api
  namespace: apps
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: jvm-api
  updatePolicy:
    updateMode: Off
  resourcePolicy:
    containerPolicies:
      - containerName: app
        controlledResources: [memory]
        controlledValues: RequestsOnly
        minAllowed:
          memory: 2Gi
        maxAllowed:
          memory: 12Gi
```

Use `minAllowed` to preserve a tested startup floor while evidence accumulates. Use `maxAllowed` to preserve schedulability, but alert when `uncappedTarget` exceeds it; a cap that repeatedly causes OOM only conceals demand.

`RequestsOnly` leaves a deliberately configured memory limit unchanged. If VPA controls limits too, it preserves the original request-to-limit ratio. Review application heap/buffer configuration whenever requests or limits move—VPA does not retune JVM, database, or runtime settings inside the container.

## Customize OOM Behavior Only with the Alpha Gate

VPA 1.7's API includes per-container fields such as:

```yaml
resourcePolicy:
  containerPolicies:
    - containerName: app
      oomBumpUpRatio: "1.5"
      oomMinBumpUp: 256Mi
```

Current recommender source applies these fields only when `--feature-gates=PerVPAConfig=true`; otherwise it logs that it is falling back to the global values. `PerVPAConfig` is alpha and disabled by default. For `oomBumpUpRatio` and `oomMinBumpUp`, enable the gate on the admission controller so new objects pass feature-gated validation and on the recommender so it consumes the fields. The updater additionally needs this gate only for updater-owned per-VPA fields such as `evictAfterOOMSeconds`. Pin the VPA release and test CRD compatibility before using the fields.

A larger bump reacts faster but can amplify a misdiagnosed OOM or exceed available nodes. First establish whether the container hit its cgroup limit, the node experienced pressure, a sidecar was killed, or an application bug consumed unbounded memory.

## Use CPU Startup Boost for CPU, Not Memory

VPA 1.7 introduces alpha CPU Startup Boost. It temporarily multiplies the admitted CPU recommendation or adds a quantity, then removes the boost in place after the Pod becomes Ready and `durationSeconds` elapses:

```yaml
spec:
  startupBoost:
    cpu:
      type: Factor
      factor: 3
      durationSeconds: 20
```

Enable `--feature-gates=CPUStartupBoost=true` on the VPA admission controller and updater. It requires Kubernetes 1.33+ with `InPlacePodVerticalScaling` enabled. It is CPU-only; it does not solve startup memory OOMs. Unboosting uses in-place resize and can be delayed by update safety or cluster constraints.

Startup Boost is independent of normal VPA actuation. A VPA-level `updateMode: Off` still allows a configured boost at admission and later unboosting; use `Off` without `startupBoost` when you need recommendation-only observation.

For memory startup, use a safe initial request/limit, `minAllowed`, representative history, and application configuration. Current recommender source skips metric samples for init containers, including restartable init-container sidecars, so size startup init work explicitly.

## Verify That OOM Evidence Is Visible

```bash
kubectl -n apps get pod -l app=jvm-api -o json | jq '
  .items[].status.containerStatuses[] |
  {name, restartCount, lastTerminationState, state}'
kubectl -n apps get events --sort-by=.lastTimestamp | tail -n 50
kubectl -n apps get vpa jvm-api -o yaml
```

Retain container termination metrics and logs outside the Pod lifecycle. A recreated Pod no longer exposes the old Pod's status, and VPA does not promise to catch every OOM. Correlate `OOMKilled` with memory working-set peaks and the recommendation transition time.

Test cold starts, cache warm-ups, large configuration loads, and restore/recovery paths. A startup probe changes when Kubernetes judges startup health; it does not allocate more CPU or memory.

## Official Documentation

- [VPA example: custom memory bump-up after OOMKill](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/examples.md#custom-memory-bump-up-after-oomkill)
- [VPA recommender and updater flags](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md)
- [VPA OOM sample calculation source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/model/container.go)
- [VPA API per-container OOM and startup fields](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#containerresourcepolicy)
- [VPA per-object component configuration AEP](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/enhancements/8026-per-vpa-component-configuration/README.md)
- [VPA CPU Startup Boost](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md#cpu-startup-boost)
- [VPA CPU Startup Boost AEP](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/enhancements/7862-cpu-startup-boost/README.md)
- [Kubernetes container resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

## Conclusion

Use VPA history as one startup signal, not the sole safety mechanism. Preserve a tested memory floor, watch uncapped demand and OOM evidence, and understand the default 20%/100 MiB synthetic bump. Use alpha CPU Startup Boost only for CPU bursts; memory startup still requires explicit capacity, representative tests, and application-aware limits.
