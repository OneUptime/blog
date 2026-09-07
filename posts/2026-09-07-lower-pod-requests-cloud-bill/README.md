# Why Lower Pod Requests May Not Lower Your Cloud Bill

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rightsizing, Cost Optimization, Cloud Computing

Description: Turn smaller pod requests into actual savings by fixing fragmentation, scheduling constraints, and node scale-down blockers.

---

Cloud providers bill for nodes or managed pod allocations, not for the YAML diff itself. Lowering Kubernetes requests creates potential capacity. It becomes a saving only when the cluster avoids adding capacity or can remove paid capacity.

The missing step is usually placement and consolidation.

## Follow the chain from request to invoice

A request affects scheduler placement. Node autoscalers use requests and scheduling constraints when deciding whether pods need new nodes and whether existing nodes can be consolidated. They do not base these decisions directly on low runtime usage.

The savings chain is:

```text
lower correct pod request
  -> scheduler can place pods more densely
  -> all pods from one or more nodes can move elsewhere
  -> autoscaler or operator removes those nodes
  -> billed node hours decline
```

If any arrow fails, the immediate bill stays flat. The change may still delay a future scale-up, which is a real avoided cost but should be reported separately.

## Measure requests and usage separately

Usage shows application efficiency and risk. Requests show schedulable demand. Track both by workload and node:

```text
request allocation = sum of scheduled pod requests / node allocatable
runtime utilization = measured resource use / node allocatable
```

A node with 30 percent CPU usage and 85 percent requested memory is not empty from the scheduler's perspective. Lowering CPU requests will not free it when memory is the binding dimension.

Use allocatable, not advertised machine capacity. System reservations, eviction thresholds, and node-level agents reduce what application pods can consume.

## Find the stranded dimension

For every node, calculate remaining requested CPU and memory. Then compare the remainder with actual pod shapes. A node with 1500m CPU and 300Mi memory free cannot accept a pod requesting 500m and 512Mi. CPU appears idle, but the memory fragment is unusable.

Common fragmentation causes include:

- CPU-heavy and memory-heavy pods placed in unhelpful combinations;
- one large pod that fits only a few node types;
- topology spread and anti-affinity;
- zone-bound persistent volumes;
- GPU, architecture, or local-disk requirements;
- host ports and volume attachment limits;
- maximum pod count or IP exhaustion;
- per-node DaemonSet overhead.

Rightsize the binding resource and improve the workload mix. Lowering an already abundant dimension cannot make a node removable.

## Identify consolidation blockers

An underfilled node may remain because its pods cannot be moved. Check:

- PodDisruptionBudgets with no allowed disruptions;
- unmanaged or singleton pods;
- local ephemeral data that cannot be recreated;
- required node affinity or a unique taint;
- insufficient capacity in another zone;
- a node group minimum size;
- autoscaler consolidation settings and delay;
- a rollout, job, or newly added pod that temporarily consumes room.

Kubernetes documents that node consolidation considers pod requests and must be able to reschedule pods. It also treats nodes containing only DaemonSet and static pods as empty for consolidation purposes, although implementation details vary by autoscaler.

## Quantify a removable-node target

Do not begin with a percentage reduction across every deployment. Begin with a node target:

```text
goal: remove 3 general-purpose nodes
per-node allocatable: 7.2 CPU, 28Gi memory
capacity to free: 21.6 CPU, 84Gi memory
constraints: keep one-node failure headroom in every zone
```

Then select low-risk workload requests whose aggregate reduction and placement make that target feasible. Simulate the actual pod vectors, not just totals. Twenty pods each needing 2Gi cannot necessarily fit into an aggregate 40Gi spread across fragments.

## Improve placement and pool design

Options include:

- offer multiple node shapes so the autoscaler can match pending pod vectors;
- place complementary CPU-heavy and memory-heavy workloads together;
- remove obsolete affinity and topology constraints;
- tune scheduler scoring when you operate the control plane;
- use a descheduler or autoscaler consolidation mechanism with disruption controls;
- isolate exceptional large pods in a suitable pool;
- rightsize DaemonSets because their requests repeat on every node.

The Kubernetes `NodeResourcesFit` scheduler plugin supports `MostAllocated` and `RequestedToCapacityRatio` strategies for bin packing. Managed services may not expose scheduler configuration, so prefer provider-supported autoscaling and placement features there.

## Verify the bill-side outcome

After rollout, observe long enough for consolidation delays and billing granularity:

```text
before and after:
- node count by pool, zone, and machine type
- requested and used CPU and memory
- unschedulable pod time
- node launches and removals
- service SLOs and workload throughput
- billed node hours and effective discounts
```

Do not claim savings from list price if commitments already cover the nodes. Report marginal cost, commitment utilization, and avoided on-demand growth separately.

Keep rollback capacity in mind. If larger old requests are restored after nodes disappear, replacement pods can remain pending while new nodes launch.

## Conclusion

Lower requests create schedulable capacity, not automatic savings. Find the binding resource, remove scheduling and disruption blockers, and target whole removable nodes or avoided growth. Confirm both workload safety and actual billed capacity before declaring the rightsize successful.

## Official Documentation

- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes resource bin packing](https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/)
- [Kubernetes resource requests and scheduling](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
