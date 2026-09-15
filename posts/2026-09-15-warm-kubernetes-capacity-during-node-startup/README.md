# How to Size Warm Kubernetes Capacity for Traffic Bursts During Node Startup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Capacity Planning, Autoscaling, Performance, Scalability

Description: Calculate ready-pod and warm-node reserves from burst demand, startup delay, and the amount of queueing the service can tolerate.

---

A Kubernetes cluster can have an autoscaler configured for forty replicas and still fail a burst requiring twenty. The missing replicas may be waiting for nodes, image pulls, application startup, or readiness. Maximum scale describes a ceiling; warm capacity describes what can serve traffic before that ceiling becomes available.

Calculate the burst coverage from a measured timeline, distinguishing ready application replicas from merely available node space.

## Measure the complete scale-up path

Record timestamps for the following sequence during representative scale events:

1. traffic exceeds the current serving envelope;
2. the scaling metric becomes visible and the HPA requests replicas;
3. new Pods become unschedulable and node provisioning starts;
4. the node becomes usable for the workload;
5. images are available and containers start;
6. readiness succeeds and the replicas actually receive traffic.

The HPA changes workload replica counts through a periodic control loop. Node autoscaling typically reacts to unschedulable Pods and supplies placement capacity. Neither implies that a newly requested replica is already serving traffic. [Kubernetes HPA](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) and [node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/).

Measure the entire delay distribution, including slow image pulls, cloud capacity shortages, and initialization. Use a chosen conservative percentile or bounded operational scenario; do not add unrelated percentiles and claim the sum is an end-to-end percentile.

## Calculate the ready capacity needed for an immediate burst

Assume these illustrative, measured inputs:

| Input | Value |
| --- | ---: |
| Normal traffic | 6,000 requests/s |
| Immediate burst | 10,000 requests/s |
| Sustainable throughput per ready Pod | 500 requests/s |
| Complete cold scale-up delay | 180 seconds |
| Existing ready Pods | 12 |

The 500 requests/s value must already satisfy the API's latency and success objectives for the modeled mix. It is not a CPU-limit conversion.

For a synchronous service that cannot tolerate meaningful buffering:

```text
ready Pods required = ceil(10,000 / 500) = 20
additional ready Pods = 20 - 12 = 8
```

Those eight replicas need to be serving before the step arrives. A node with empty space is useful, but it cannot absorb requests while the application process is still starting.

If the burst is scheduled, scale early enough that readiness and actual traffic receipt are confirmed before the event. For an unpredictable step, retain the required ready baseline or define an explicit admission/degradation policy.

## Quantify what buffering would require

With only twelve ready Pods, the immediate deficit is 4,000 requests/s. Under a simplified assumption that no new capacity becomes useful until 180 seconds:

```text
backlog at readiness = (10,000 - 6,000) * 180 = 720,000 requests
```

For a varying arrival curve, update the backlog each small time interval:

```text
B_next = max(0, B_now + (arrivals_per_second - capacity_per_second) * interval_seconds)
```

This recurrence allows queues to drain during quiet intervals. Summing only positive deficits would miss that draining behavior.

At twenty ready Pods, capacity becomes 10,000/s: enough for new arrivals but no net recovery capacity while that traffic continues. If twenty-four ready Pods can safely deliver 12,000/s, the simplified drain time is `720,000 / 2,000 = 360 seconds` after readiness. Check per-request deadlines and memory or broker storage separately; most interactive APIs cannot treat a backlog this large as an acceptable buffer.

## Distinguish three kinds of reserve

| Reserve | Delay still to cover |
| --- | --- |
| Ready application Pods | Traffic distribution and any remaining warmup |
| Running nodes with usable free space | Scheduling, image availability, application startup, readiness |
| Ability to provision new nodes | The complete cold path |

Suppose the warm-node path takes 25 seconds from scale decision to serving Pods. The same 4,000/s deficit still creates 100,000 queued requests during that interval. Warm nodes reduce the delay, but only ready replicas eliminate it for an immediate step.

Low-priority placeholder Pods can hold schedulable space and be preempted by application Pods. However, preemption and termination take time, and placement rules must permit the replacement. Treat this as a warm-node strategy, not as ready API capacity. [Kubernetes priority and preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/).

## Convert the replica requirement into node space

Assume each ready API Pod requests 0.5 CPU and 1 GiB memory, including its regular sidecars. Each suitable node has 4 CPU and 8 GiB remaining for these Pods after system reservations and other workload requests:

```text
CPU slots per node    = floor(4 / 0.5) = 8
memory slots per node = floor(8 / 1)   = 8
required node count   = ceil(20 / 8)   = 3
```

This is a resource lower bound under homogeneous placement assumptions. Check Pod count limits, IP availability, taints, affinity, topology spread, volumes, and per-zone quotas. Scheduling uses resource requests, and allocatable resources account for node reservations; raw machine size is not the usable workload budget. [Kubernetes resource requests](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) and [node allocatable reservations](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/).

Three nodes hosting twenty ready Pods do not provide twenty surviving Pods after a node loss. If failure must coincide with the burst, calculate ready capacity in the surviving domains and test that scenario explicitly. Empty replacement space and surviving ready replicas serve different purposes.

## Make the reserve durable

Set the HPA minimum to the ready baseline required by the scenario, and ensure the node policy, quotas, and placement constraints can keep it scheduled. Check that consolidation or scale-down does not remove the intended reserve. If retaining only warm nodes, verify the node autoscaler's supported reservation mechanism rather than assuming idle nodes will remain indefinitely.

Replay the burst from the minimum steady state. Record offered and accepted requests, queue delay, errors, time to first useful new replica, time to full required capacity, and recovery time. Repeat with an uncached image and a slow startup path. The plan should state which demand is covered immediately, which is buffered, and how long cold scaling may take before the user objective is exceeded.
