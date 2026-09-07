# Choosing CPU-Optimized or Memory-Optimized Kubernetes Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Rightsizing, Capacity Planning, Cloud Computing

Description: Select node families from allocatable workload request ratios, pod-size distributions, secondary limits, availability, and measured price per work.

---

Choosing between CPU-optimized and memory-optimized nodes is not a matter of checking which utilization chart is higher. Kubernetes places request vectors into node allocatable vectors. The best family is the one that fits the real pod mix with acceptable resilience and the lowest measured cost per useful work.

## Compare allocatable ratios

Calculate ratios using allocatable resources after provider and kubelet reservations:

```text
node memory ratio = allocatable memory GiB / allocatable vCPU
pod memory ratio = requested memory GiB / requested vCPU
```

A pool whose pods cluster near 2Gi per vCPU may fit a compute-optimized family. A pool near 8Gi per vCPU may fit a memory-optimized family. General-purpose nodes often work well when complementary CPU-heavy and memory-heavy pods share the pool.

Do not use machine-advertised memory in this comparison. Kubernetes schedules to allocatable, and DaemonSets consume an additional per-node slice.

## Use distributions rather than one fleet average

Create a weighted inventory by pod class:

| Pod class | Replicas at peak | CPU request | Memory request | GiB per vCPU |
| --- | ---: | ---: | ---: | ---: |
| API | 40 | 500m | 1Gi | 2 |
| Cache | 6 | 1 | 8Gi | 8 |
| Worker | 20 | 2 | 4Gi | 2 |

The fleet ratio is useful, but pod indivisibility matters. A 16Gi cache pod cannot use four separate 4Gi fragments. Simulate exact replicas across candidate shapes.

Segment workloads that cannot share nodes because of taints, architecture, zones, compliance, or accelerators. Their ratios belong to separate pools.

## Calculate the real per-node workload budget

For each candidate type, first calculate the capacity left after per-node costs:

```text
base workload budget = node allocatable
                     - matching DaemonSet effective requests
                     - deliberate failure or rollout reserve
```

Pod overhead is a per-Pod cost declared by a RuntimeClass, not one fixed subtraction from the node. Include it in each Pod's effective request during packing. Then pack the peak replica set, HPA surge, and one-node failure scenario. A node that fits steady state perfectly but cannot drain safely is too tight.

Google's GKE node-sizing guidance explicitly recommends considering workload requests, planned limits, scale-up overhead, allocatable resources, and the tradeoff between a few large nodes and many smaller ones. Larger nodes reduce repeated DaemonSet overhead but increase the disruption and blast radius when one fails. Smaller nodes give finer autoscaling increments but repeat per-node costs.

## Check limits beyond CPU and memory

A family change can alter:

- network bandwidth and packets per second;
- storage bandwidth, IOPS, and attachment limits;
- local SSD and ephemeral storage;
- maximum pod density and IP consumption;
- NUMA layout and memory bandwidth;
- CPU architecture and instruction support;
- accelerator availability;
- price and capacity availability by zone.

Memory-optimized does not guarantee the storage or network profile a database needs. CPU-optimized does not guarantee high single-thread performance. Benchmark the specific generation and size.

## Compare cost per schedulable capacity

List price per vCPU can be misleading when memory strands half the cores. Calculate:

```text
cost per placed peak replica
cost per allocatable vCPU actually requested
cost per allocatable GiB actually requested
cost per successful request or completed job
```

Include autoscaling granularity. If the next node adds far more of the non-binding resource than needed, a different shape or mixed pool can reduce step waste.

Cloud discounts and commitments affect marginal cost. A technically denser family may not reduce the bill while an existing commitment covers the current family. Keep operational fit and commercial coverage as separate columns.

## Prefer heterogeneous pools when the evidence supports them

One node family does not need to serve every workload. A practical design might use:

- compute-optimized nodes for stateless CPU-heavy workers;
- memory-optimized nodes for caches and large heaps;
- general-purpose nodes for system and mixed services;
- special pools for GPU, local disk, or licensed software.

Use taints, tolerations, and affinity only where isolation is required. Excessive hard placement constraints reduce bin-packing flexibility and can create new fragmentation.

With a node autoscaler, expose a controlled set of allowed families and verify how it chooses among them. Autoscalers provision for pending pod requests and constraints, not measured runtime usage. Correct requests remain essential.

## Validate under operational scenarios

Create a small candidate pool and test:

1. steady peak replica count;
2. HPA scale-up before new nodes are ready;
3. Deployment surge;
4. drain of the largest node;
5. loss of a zone or node;
6. storage and network saturation;
7. scale-down and consolidation.

Compare application SLOs and billed hours with a control pool. Monitor pending pod reasons so a hidden volume or affinity constraint does not masquerade as insufficient CPU.

## Conclusion

Choose node families from allocatable ratios and exact pod distributions, then test secondary limits, autoscaling increments, and failure scenarios. Use heterogeneous pools for genuinely different shapes, but avoid constraints that defeat packing. The winning option has the lowest safe cost per completed work.

## Official Documentation

- [GKE node sizing guidance](https://cloud.google.com/kubernetes-engine/docs/concepts/plan-node-sizes)
- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes node allocatable](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/)
- [Kubernetes resource bin packing](https://kubernetes.io/docs/concepts/scheduling-eviction/resource-bin-packing/)
