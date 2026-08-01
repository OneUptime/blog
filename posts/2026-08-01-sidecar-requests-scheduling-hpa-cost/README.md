# How Sidecar Resource Requests Affect Scheduling, HPA, and Cluster Cost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar Containers, Resource Requests, Horizontal Pod Autoscaler, Scheduling, Cloud Cost

Description: Trace sidecar CPU and memory requests through scheduler fit, HPA utilization, node scaling, namespace quota, and per-replica cluster cost.

---

A sidecar's resource request is multiplied by every replica that receives the sidecar. It affects where Pods fit, how percentage-based Horizontal Pod Autoscaling interprets usage, whether namespace quota admits new replicas, and when node autoscaling must add capacity.

It is not merely documentation and it is not the same as actual usage or a provider bill. It is a capacity claim that several Kubernetes control loops use as input.

## Start with the Effective Pod Request

For a Pod without explicit Pod-level resources, Kubernetes computes each resource independently:

```text
effective Pod request
  = Pod overhead
    + max(
        largest ordered init phase,
        sum of all app containers and native sidecars in steady state
      )
```

An ordered init phase includes the current init container plus every native sidecar declared before it, because those sidecars are already running. A native sidecar is an `initContainers` entry with container-level `restartPolicy: Always`.

A small sidecar does not always increase the effective request immediately. If a one-time init phase already dominates CPU or memory, the steady-state sum can grow until it crosses that peak. Once steady state dominates, each additional sidecar request raises the effective Pod request directly.

With the beta `PodLevelResources` feature, an explicit supported value under `spec.resources.requests` becomes authoritative for that resource; do not add it to the container-derived number. Pod overhead remains separate.

## Scheduling Uses Requests, Not Current Idle Usage

The scheduler compares Pod requests with each node's allocatable resources and the requests already assigned there. A node can be nearly idle and still reject a Pod with `Insufficient cpu` or `Insufficient memory` because its unallocated request capacity is exhausted.

For this Pod:

```yaml
spec:
  initContainers:
    - name: log-agent
      image: registry.example.com/log-agent:5.0.0
      restartPolicy: Always
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
  containers:
    - name: api
      image: registry.example.com/api:17.0.0
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
```

The steady-state request is `600m` CPU and `640Mi` memory before Pod overhead. Even if the sidecar currently consumes only `5m` and `40Mi`, Kubernetes must plan for its declared `100m` and `128Mi` request.

An approximate single-Pod-resource packing bound is:

```text
pods by CPU    = floor(node allocatable CPU / effective Pod CPU request)
pods by memory = floor(node allocatable memory / effective Pod memory request)
```

The smaller bound wins, subject to existing Pods, Pod-count limits, topology spread, affinities, taints, volumes, and other scheduler constraints. Real scheduling is bin packing across all of those dimensions, not division on an empty node.

## Requests Multiply Across Replicas

At 200 replicas, the example sidecar alone declares:

```text
CPU    = 200 × 100m  = 20 CPU
Memory = 200 × 128Mi = 25Gi
```

Those resources may be spread imperfectly across node sizes and failure domains, causing additional unused fragments. Injected sidecars can therefore change the number of nodes required even when application traffic is unchanged.

Node autoscalers generally react when Pods cannot schedule. If new replicas are pending because their effective requests do not fit, node autoscaling may provision capacity. Overstated requests can scale the cluster early and reduce packing density; understated requests can pack too tightly, increasing throttling, OOM kills, and eviction risk.

Cloud billing remains provider-specific. On ordinary node-based clusters, requests influence cost indirectly through node count and shape. Some managed or serverless Pod products price declared or allocated resources more directly. Cost-allocation tools may also attribute shared node cost by request rather than usage. Verify the platform's billing rules before converting a request into currency.

## The Default HPA Resource Metric Includes the Sidecar

For an HPA metric of type `Resource` with target type `Utilization`, Kubernetes compares Pod resource usage with Pod resource requests. The HPA documentation defines utilization as usage divided by the corresponding request and notes that Pod usage aggregates containers.

Current HPA request accounting includes ordinary app containers and restartable init containers-that is, native sidecars. Regular init containers that completed before steady state are not included in this percentage denominator. If Pod-level resources are configured for the resource, HPA can use that Pod-level request instead.

Consider one replica:

| Container | CPU request | Current CPU usage |
| --- | ---: | ---: |
| `api` | 500m | 350m |
| `log-agent` | 200m | 20m |
| **Pod** | **700m** | **370m** |

The app itself is at:

```text
350m / 500m = 70%
```

The whole Pod is at:

```text
(350m + 20m) / (500m + 200m) ≈ 52.9%
```

With a 60% CPU target, an app-only signal suggests scale-up while the aggregate Pod signal does not. The lightly used sidecar dilutes utilization. If the sidecar instead spikes to `180m`, Pod utilization becomes about `75.7%` and can cause scale-up even though application demand did not change.

Neither result is inherently wrong. Choose whether replicas should follow total Pod CPU or application CPU.

## Use `ContainerResource` for Application-Driven Scaling

The `ContainerResource` HPA metric source is stable from Kubernetes 1.30. It can target the application container and ignore sidecar usage:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: ContainerResource
      containerResource:
        name: cpu
        container: api
        target:
          type: Utilization
          averageUtilization: 60
```

This scales on `api` usage divided by the `api` request. It is useful when the sidecar has fixed overhead unrelated to application throughput.

Keep these caveats in view:

- the named container and its request must exist in the relevant Pods;
- when renaming a container, update the HPA to cover the transition before rolling out the name change;
- application CPU is not always the bottleneck-a saturated mandatory proxy may justify a second metric;
- with multiple HPA metrics, Kubernetes calculates each recommendation and normally chooses the largest replica count.

An `AverageValue` target uses a raw per-Pod or per-container value instead of percentage of requests. That avoids request-denominator effects but still requires a threshold tied to capacity.

## Missing Requests Can Disable Percentage Scaling

For a `Resource` utilization metric, if a participating container lacks the relevant request, Pod utilization is undefined and the HPA cannot act on that metric for the Pod as normal. Sidecar injection without requests can therefore break an HPA that previously worked.

For `ContainerResource`, define the request on the selected container. Do not omit sidecar requests merely to exclude the sidecar from scaling-select the intended metric source instead.

Also inspect defaults. A `LimitRange` may insert requests, and Kubernetes uses a container limit as its request when the request is omitted and no other default applies. Calculate from the admitted Pod, not only the source Deployment.

## Sidecar Readiness Also Interacts with HPA

A native sidecar participates in whole-Pod readiness. While it is crashed, restarting, or failing readiness, the Pod can be unready. The HPA treats not-yet-ready Pods and missing CPU metrics conservatively, especially during configurable initialization windows.

A flapping best-effort log agent can therefore influence both Service routing and autoscaling if its readiness probe is coupled to the Pod. Define sidecar readiness only when serving really requires it. Use a startup probe to cover legitimate startup CPU spikes and ensure the cluster-wide HPA initialization windows fit the workload.

## Quota and QoS See the Sidecar Too

Namespace `ResourceQuota` accounts admitted requests and limits. An injected sidecar can make a rollout or HPA scale-up fail quota even though the application container settings did not change.

Sidecars also participate in Pod Quality of Service classification. To qualify for `Guaranteed` under the traditional container-level rules, every app, regular init, and native sidecar must satisfy the required CPU and memory request/limit equality. A sidecar missing one of those fields can make the Pod `Burstable`.

Requests influence CPU weighting and memory-pressure behavior at the node. Limits are separate:

- a CPU limit can throttle the sidecar;
- a memory limit can cause an OOM kill and independent sidecar restart;
- a high limit does not substitute for an accurate scheduler request;
- an unlimited sidecar can consume beyond its request when capacity exists and increase node pressure.

## Right-Size Sidecars as a Separate Workload Component

Collect per-container usage rather than dividing Pod usage by intuition:

```bash
kubectl top pod --containers
kubectl describe pod <pod-name>
kubectl describe node <node-name>
kubectl get hpa api -o yaml
kubectl get resourcequota,limitrange -n <namespace> -o yaml
```

Use a representative window that includes:

- startup and configuration reloads;
- normal and peak request rates;
- log or telemetry bursts;
- control-plane disconnections and queue growth;
- shutdown flushing;
- CPU throttling and memory working-set behavior.

Then review the feedback loops:

1. Does the sidecar request let the scheduler place the Pod safely?
2. Does the chosen HPA denominator represent the component that needs scaling?
3. Can quota admit `maxReplicas` with sidecars and rollout surge included?
4. How many extra nodes does the request require at expected replicas?
5. Does a sidecar outage make Pods unready and alter HPA metrics?
6. Is a fixed per-Pod sidecar still economical at the target scale, or would a node-level or shared collector fit better?

The goal is not the smallest possible request. It is the smallest request that truthfully represents needed capacity and produces the intended scheduling and autoscaling behavior. A sidecar is operationally part of every replica, so its resource policy must be designed with the application rather than appended after the fact.

## Official Documentation

- [Kubernetes: Sidecar Container Resource Sharing](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/#resource-sharing-within-containers)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes: Node Autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes Enhancement Proposal 753: Sidecar Resource Calculation](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers#resources-calculation-for-scheduling-and-pod-admission)
- [Kubernetes HPA Controller: Restartable Init Container Request Calculation](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/podautoscaler/replica_calculator.go)
