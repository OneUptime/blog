# Kubernetes Pod Resource Requests with Init and Sidecar Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Resource Requests, Init Container, Scheduling, CPU, Memory

Description: Calculate exact per-resource Pod requests across ordered init phases, native sidecars, steady-state app containers, and Pod overhead.

---

A native sidecar runs during part of initialization and throughout the application's steady state. Kubernetes therefore cannot calculate the Pod request by taking only the largest init container or only the sum of `spec.containers`.

The exact calculation is order-aware. For each resource-CPU, memory, ephemeral storage, and so on-Kubernetes compares every possible init phase with the steady-state app-plus-sidecar phase, chooses the largest value for that resource, and then adds Pod overhead.

This article describes the container-level calculation used when the Pod does not set an explicit Pod-level resource budget. Kubernetes' newer `PodLevelResources` feature is covered separately below.

## Define the Container Sets

Given a Pod:

- **app containers** are entries in `spec.containers`;
- **regular init containers** are entries in `spec.initContainers` without a container-level `restartPolicy: Always`;
- **native sidecars** are entries in `spec.initContainers` with `restartPolicy: Always`.

Regular init containers execute serially and terminate. Native sidecars start at their position in the init list and remain running during every later init phase and steady state.

That last sentence is why declaration order changes resource accounting.

## The Exact Request Formula

Let `q(c, r)` be container `c`'s admitted request for resource `r`. For the init container at index `i`, define:

```text
sidecarsBefore(i, r)
  = sum of q(s, r) for native sidecars s declared before index i

initPhase(i, r)
  = sidecarsBefore(i, r) + q(init[i], r)
```

If `init[i]` is itself a native sidecar, its own request is the `q(init[i], r)` term; every previously started sidecar is also still running.

Then:

```text
initPeak(r)
  = max over every i of initPhase(i, r)

steadyState(r)
  = sum of q(app, r) for every app container
    + sum of q(sidecar, r) for every native sidecar

effectivePodRequest(r)
  = max(initPeak(r), steadyState(r)) + podOverhead(r)
```

Apply the formula separately to each resource. CPU can peak during one phase while memory peaks during another, so the resulting request vector does not need to describe one instant that actually occurs.

For a Pod with no init containers, `initPeak` is zero. For a Pod with no native sidecars, this reduces to the familiar calculation:

```text
max(largest regular init request, sum of app-container requests)
+ Pod overhead
```

## Work Through a Full Example

Consider these requests in declaration order:

```yaml
spec:
  initContainers:
    - name: render-config
      image: registry.example.com/render-config:1.0.0
      resources:
        requests:
          cpu: 600m
          memory: 256Mi

    - name: network-proxy
      image: registry.example.com/network-proxy:4.0.0
      restartPolicy: Always
      resources:
        requests:
          cpu: 100m
          memory: 128Mi

    - name: warm-cache
      image: registry.example.com/warm-cache:2.0.0
      resources:
        requests:
          cpu: 800m
          memory: 512Mi

    - name: log-agent
      image: registry.example.com/log-agent:3.0.0
      restartPolicy: Always
      resources:
        requests:
          cpu: 50m
          memory: 64Mi

  containers:
    - name: api
      image: registry.example.com/api:16.0.0
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
    - name: metrics
      image: registry.example.com/metrics:2.0.0
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
```

Calculate every init phase:

| Init entry | Sidecars already running | CPU phase request | Memory phase request |
| --- | --- | ---: | ---: |
| `render-config` | none | 600m | 256Mi |
| `network-proxy` | none | 100m | 128Mi |
| `warm-cache` | `network-proxy` | 100m + 800m = 900m | 128Mi + 512Mi = 640Mi |
| `log-agent` | `network-proxy` | 100m + 50m = 150m | 128Mi + 64Mi = 192Mi |

The init peaks are:

```text
CPU initPeak    = max(600m, 100m, 900m, 150m) = 900m
Memory initPeak = max(256Mi, 128Mi, 640Mi, 192Mi) = 640Mi
```

Now calculate steady state, when both native sidecars and both app containers run:

```text
CPU steadyState
  = 100m + 50m + 500m + 50m
  = 700m

Memory steadyState
  = 128Mi + 64Mi + 512Mi + 64Mi
  = 768Mi
```

Before overhead:

```text
effective CPU request    = max(900m, 700m) = 900m
effective memory request = max(640Mi, 768Mi) = 768Mi
```

If the Pod's RuntimeClass causes the admitted Pod to have overhead of `30m` CPU and `32Mi` memory, the scheduler-facing totals are:

```text
CPU    = 900m + 30m = 930m
Memory = 768Mi + 32Mi = 800Mi
```

Pod overhead is not a normal field that an application author invents on an individual Pod. A RuntimeClass admission path sets `spec.overhead`, and Kubernetes accounts it in addition to container demand.

## Why Sidecar Order Changes the Peak

In the example, `render-config` runs before any native sidecar, so its phase uses only 600m and 256Mi. `warm-cache` runs after `network-proxy`, so the proxy request must be added.

If `log-agent` were moved before `warm-cache`, both sidecars would overlap the cache warmer:

```text
warm-cache CPU phase    = 100m + 50m + 800m = 950m
warm-cache memory phase = 128Mi + 64Mi + 512Mi = 704Mi
```

Steady state would be unchanged, but the CPU effective request would rise from 900m to 950m before overhead. Order containers according to real dependencies; do not reorder solely to manipulate accounting. The reservation exists because the processes can actually overlap.

## Calculate Limits Separately

The same phase structure applies to limits, but substitute each container's limit for its request:

```text
effectivePodLimit(r)
  = max(init limit phases, steady-state app + sidecar limits)
    + podOverhead(r), when a finite nonzero aggregate limit exists
```

Requests and limits serve different purposes. The scheduler primarily uses requests for CPU and memory fit. The kubelet and container runtime use limits for enforcement; CPU limits generally cause throttling, while memory limits are enforced reactively and can result in OOM kills.

If any concurrently relevant container has no limit for a resource, treat that component as unbounded for aggregate-limit reasoning rather than silently substituting zero. Kubernetes' sidecar documentation describes an unspecified resource limit as the highest limit. Do not claim a finite Pod memory ceiling by adding only the containers that happen to specify one.

## Use the Final Admitted Requests

The calculation operates on the Pod accepted by the API server, not necessarily the YAML in source control. Admission can change values:

- when a limit is set but the request is omitted and no other default applies, Kubernetes uses the limit as the request;
- a namespace `LimitRange` can inject default requests and limits;
- a mutating admission webhook can add a sidecar and its resources;
- a RuntimeClass can add Pod overhead.

Inspect the stored Pod:

```bash
kubectl get pod <pod-name> -o yaml
kubectl get pod <pod-name> -o jsonpath='{.spec.overhead}'
kubectl get limitrange -n <namespace> -o yaml
kubectl get resourcequota -n <namespace> -o yaml
```

Calculate from that admitted representation. A service-mesh injector that adds a 200m proxy changes both steady state and later init phases even if the original Deployment manifest never mentioned it.

## Pod-Level Resources Change the Input

The `PodLevelResources` feature lets a Pod specify supported resources under `spec.resources.requests` and `spec.resources.limits`. It became beta and enabled by default in Kubernetes 1.34, but availability still depends on the cluster's version and feature configuration.

When an explicit Pod-level request is set for a supported resource, that Pod-level value is used for that resource instead of the traditional container-derived aggregate; Pod overhead is still accounted separately. Container-level settings can still affect per-container management and must satisfy API constraints.

Therefore, do not apply the container formula and then add `spec.resources.requests.cpu` a second time. First determine whether an authoritative Pod-level value exists for that resource. The worked example assumes it does not.

In-place resource resizing adds another operational wrinkle: while desired and allocated resources differ, scheduling-related helpers can account for status-reported allocations as well as the new spec. Use current Pod status when debugging a resize rather than calculating only from the original manifest.

## Requests Affect More Than Placement

Kubernetes uses the effective Pod request for scheduler fit and Pod-level cgroup allocation. Namespace quotas and admission limits also account for Pod resources. All app, regular init, and native sidecar settings participate in the Pod's Quality of Service classification.

A high one-time init request can reserve node capacity for the Pod's whole lifetime even though that init process has exited. Kubernetes computes one placement request for the Pod and does not dynamically shrink that scheduler allocation after initialization to fit another Pod.

Conversely, setting sidecar requests to zero does not make its real usage disappear. It only hides demand from placement decisions, weakens resource guarantees, and can break percentage-based HPA calculations.

## A Review Checklist

For every resource independently:

1. Read the admitted app, init, and sidecar requests.
2. Walk `initContainers` from top to bottom.
3. Keep a cumulative sum of sidecars already started.
4. Add the current init entry to that cumulative sum and record the phase.
5. Find the largest init phase.
6. Sum every app and native sidecar for steady state.
7. Choose the larger of init peak and steady state.
8. If an explicit Pod-level request is authoritative for that resource, use it instead of the container aggregate.
9. Add Pod overhead.
10. Repeat separately for limits, treating missing limits as unbounded.

The most common error is to add every init container together. Regular init containers are sequential, but previously started native sidecars overlap every later init. The order-aware phase calculation captures exactly that difference.

## Official Documentation

- [Kubernetes: Sidecar Container Resource Sharing](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#resource-sharing-within-containers)
- [Kubernetes Enhancement Proposal 753: Resource Calculation](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers#resources-calculation-for-scheduling-and-pod-admission)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Pod Overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Kubernetes: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
