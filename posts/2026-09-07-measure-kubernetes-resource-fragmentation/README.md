# How to Measure Kubernetes Resource Fragmentation Before Changing Node Shapes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rightsizing, Capacity Planning, Cost Optimization

Description: Measure stranded CPU and memory as unschedulable resource shapes, then test node alternatives against real pod requests and constraints.

---

Average node utilization does not reveal whether free capacity is usable. Kubernetes schedules a pod only when one eligible node can satisfy all its requests and constraints. Five nodes with spare CPU can still reject a pod when each lacks enough memory.

Resource fragmentation is therefore a placement problem across multiple dimensions, not simply one minus utilization.

## Capture the scheduler's inputs

Export a point-in-time inventory containing:

- node capacity and allocatable CPU, memory, ephemeral storage, pods, and extended resources;
- every scheduled pod's effective requests;
- pending pod requests and scheduler events;
- node labels, taints, and readiness;
- pod selectors, affinity, anti-affinity, topology spread, and tolerations;
- persistent-volume zones and attachment constraints;
- DaemonSet placement and pod overhead.

Use requests for placement analysis and usage for rightsizing risk. Do not substitute one for the other.

A quick human view is available through:

```bash
kubectl describe nodes
kubectl get pods -A --field-selector=status.phase=Pending
kubectl get events -A --field-selector=reason=FailedScheduling
```

For repeatable analysis, query the API and preserve the snapshot with a timestamp. Metrics exporters can expose request totals, but reconstruct init and sidecar semantics carefully if the exporter only reports individual containers.

## Calculate residual vectors

For node `n`, calculate requested residual capacity:

```text
free_cpu[n] = allocatable_cpu[n] - sum(effective pod CPU requests)
free_mem[n] = allocatable_mem[n] - sum(effective pod memory requests)
```

Keep this as a vector. Combining it into one average loses the limiting dimension.

Example:

| Node | Free CPU | Free memory | Can fit pod 500m, 1Gi? |
| --- | ---: | ---: | --- |
| A | 1800m | 400Mi | No |
| B | 300m | 5Gi | No |
| C | 650m | 1400Mi | Yes |

The cluster has 2.75 CPU and 6.8Gi free in aggregate, but only node C can place that pod.

## Measure fragmentation against real pod shapes

There is no single useful fragmentation percentage independent of the workload. Evaluate the shapes that actually arrive.

For each common pod class, calculate:

```text
fit_count(node, class) = min(
  floor(free_cpu / class_cpu),
  floor(free_memory / class_memory),
  other applicable limits
)
```

Then apply eligibility constraints. A numerical fit on a node in the wrong zone is not a scheduler fit.

Useful measures include:

- number of nodes that can fit one more pod of each class;
- total additional replicas placeable without new nodes;
- CPU stranded on memory-bound nodes;
- memory stranded on CPU-bound nodes;
- nodes whose non-DaemonSet pods can all move elsewhere;
- pending pod-seconds by failed scheduling reason.

Weight classes by observed and forecast arrival frequency. A rare 64Gi pod should not dominate the score for a web pool, but it must have a valid destination.

## Detect ratio mismatch

Compare each pod's memory-to-CPU request ratio with the allocatable ratio of candidate nodes:

```text
pod ratio = requested GiB / requested vCPU
node ratio = allocatable GiB / allocatable vCPU
```

If most pods request 8Gi per vCPU and nodes offer 4Gi per vCPU, memory fills first and CPU becomes stranded. One complementary CPU-heavy workload can improve packing, or a memory-optimized pool may fit better.

Use distributions, not only an average ratio. A mix of 1Gi-per-vCPU and 15Gi-per-vCPU pods may average to a general-purpose shape while remaining difficult to pack because replica counts and constraints do not align.

## Simulate candidate node shapes

Replay the exact pod inventory through a bin-packing simulation for each allowed node type. Include:

1. provider and kubelet reservations;
2. every matching DaemonSet;
3. current pods in required topology domains;
4. one-node or one-zone failure headroom;
5. rollout surge and HPA growth;
6. the largest indivisible pod;
7. node and volume limits.

Run several pod orderings because greedy packing can produce different results. A scheduler simulator or provider-supported autoscaler model is preferable when available. Validate the chosen result in a small real pool because autoscaler and scheduler behavior include details a spreadsheet may omit.

## Distinguish fragmentation from safety reserve

Free capacity retained for an explicit availability objective is not waste. Label it separately:

```text
raw free capacity
- required failover reserve
- scaling reaction reserve
= optimization candidate
```

Likewise, an empty slot reserved by topology spread can be intentional resilience. The question is whether the constraint still represents a current requirement.

## Establish a before-and-after scorecard

Track the same measures through request and node changes:

- node count and cost by pool;
- request allocation by dimension;
- fit count for top pod classes;
- pending duration and failed scheduling reasons;
- consolidation attempts and blockers;
- SLO, throttling, OOM, and eviction signals.

A higher average allocation is only an improvement if pods remain schedulable during rollouts and failures.

## Conclusion

Measure Kubernetes fragmentation as the inability of residual node vectors to fit real pod shapes. Start from allocatable and effective requests, enforce every scheduling constraint, and simulate failure and surge cases. Optimize the workload-node mix while keeping explicit resilience reserves visible.

## Official Documentation

- [Kubernetes resource requests and scheduling](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes scheduler configuration](https://kubernetes.io/docs/reference/scheduling/config/)
- [Kubernetes resource bin packing](https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/)
- [Kubernetes assigning pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes node status and allocatable resources](https://kubernetes.io/docs/reference/node/node-status/)
