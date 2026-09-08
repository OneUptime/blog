# How to Size Kubernetes Nodes for Requests, Overhead, and Bin Packing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Capacity Planning, Scalability, CPU, Memory

Description: Size Kubernetes worker nodes from allocatable resources, mandatory DaemonSets, measured Pod requests, and the discrete constraints that make aggregate division misleading.

---

A Kubernetes node's advertised CPU and memory are not all available to application Pods. The scheduler works from node allocatable resources, Pod requests, and placement constraints. A spreadsheet that divides total cluster CPU by total Pod CPU ignores the problem the scheduler actually solves.

## Begin with observed allocatable capacity

For each candidate node type, inspect both capacity and allocatable:

```bash
kubectl get nodes -o custom-columns='NAME:.metadata.name,CPU:.status.capacity.cpu,ALLOC_CPU:.status.allocatable.cpu,MEM:.status.capacity.memory,ALLOC_MEM:.status.allocatable.memory,PODS:.status.allocatable.pods'
```

Kubernetes defines allocatable as the resources available to Pods. Kubelet settings such as `kubeReserved`, `systemReserved`, and eviction thresholds protect Kubernetes daemons, operating-system processes, kernel memory, and node stability. Managed services may calculate these reservations for you, so use the resulting `.status.allocatable` from representative nodes rather than subtracting an assumed percentage from the VM specification.

Keep ephemeral storage, attachable volumes, Pod count, extended resources, and huge pages in the model when relevant. A node can have spare CPU and memory but still reject a Pod because another discrete resource is exhausted.

## Subtract mandatory per-node Pods

DaemonSets commonly run networking, storage, security, log, and monitoring agents on every eligible node. Inventory the requests of the exact DaemonSet Pods that would land on each node pool:

```bash
kubectl get pods -A -o custom-columns='NS:.metadata.namespace,NAME:.metadata.name,NODE:.spec.nodeName,CPU:.spec.containers[*].resources.requests.cpu,MEM:.spec.containers[*].resources.requests.memory'
```

Use structured API output for automation; the display above is an inventory aid. Account for init containers and Pod overhead using Kubernetes' effective Pod-request rules rather than simply adding every YAML number. If the cluster enables Pod-level resources, include `spec.resources.requests` rather than relying only on per-container fields. Also include upgrade-time or provider-injected agents that exist on new nodes.

Define ordinary workload space per node:

```text
workload CPU    = node allocatable CPU    - mandatory Pod CPU requests
workload memory = node allocatable memory - mandatory Pod memory requests
```

Do not subtract actual DaemonSet usage from requests. Scheduling capacity is based on requests; runtime safety is checked separately against measured use and limits.

## Work a two-resource example

Consider a nominal 8-vCPU, 32-GiB node whose observed allocatable values are 7.1 CPU and 27 GiB. Mandatory DaemonSets request 0.55 CPU and 1.8 GiB:

```text
ordinary workload CPU    = 7.10 - 0.55 = 6.55 cores
ordinary workload memory = 27.0 - 1.8  = 25.2 GiB
```

A service Pod requests 700m CPU and 2.4 GiB:

```text
CPU fit    = floor(6.55 / 0.70) = 9 Pods
memory fit = floor(25.2 / 2.4)  = 10 Pods
```

CPU limits this idealized node to nine Pods. If operational testing requires one Pod-equivalent of CPU reserve, publish eight as the target density. Keep that reserve explicit instead of inflating every application's request.

This calculation is only a bound. Nine Pods may not actually fit if anti-affinity, topology spread, host ports, volume attachment limits, NUMA policy, GPUs, or a maximum-Pods setting conflicts.

## Simulate the actual Pod shapes

Bin packing is multidimensional and discrete. Two pools can have identical aggregate free CPU and memory while only one can place a 4-CPU, 2-GiB Pod. Model the distribution of Pod shapes, not an average Pod.

Create a representative set containing:

- each workload's replica count at forecast peak;
- effective requests after current rightsizing;
- mandatory topology and affinity rules;
- disruption surge Pods from rolling updates;
- Jobs and burst workloads expected in the same window;
- the largest indivisible Pod in each pool.

Run scheduler or autoscaler simulation in a staging cluster, or create unscheduled replicas safely and inspect scheduler events. Cluster Autoscaler simulates whether unschedulable Pods would fit on template nodes, including labels and DaemonSets, but its simulation is intentionally simpler than the scheduler. Confirm real placement before standardizing a node family.

## Compare node shapes with operational constraints

Smaller nodes reduce the capacity lost in one-node failure and can pack small Pods more precisely, but multiply DaemonSet overhead, API objects, and operational work. Larger nodes amortize per-node overhead and fit large Pods, but increase failure blast radius and stranded fragments.

For each candidate report:

```text
cost per SLO-safe application replica
DaemonSet percentage of allocatable
packing efficiency by CPU and memory
unplaceable Pod count
maximum Pods and volume attachments
replicas lost with one node
nodes required per failure zone
upgrade surge requirement
```

Validate runtime headroom after scheduler fit. CPU use above requests can cause contention, while memory is incompressible and under-requesting can lead to eviction or OOM termination. Use representative load tests and node-pressure telemetry to set requests and safety margins.

## Recheck after cluster changes

Recompute density when kubelet reservations, Kubernetes versions, CNI or CSI agents, observability DaemonSets, Pod requests, topology rules, or node images change. A new 300-MiB security agent consumes that amount on every node and may make a previously valid packing plan impossible.

Keep the sizing record reproducible:

```yaml
node_type: example-8cpu-32gib
observed_allocatable: {cpu: 7.1, memory_gib: 27.0, pods: 110}
daemonset_requests: {cpu: 0.55, memory_gib: 1.8}
target_service_pods_per_node: 8
binding_constraint: cpu
scheduler_simulation: capacity-plan-2026-09-08
```

## Conclusion

Size Kubernetes nodes from observed allocatable resources, then remove mandatory per-node Pod requests and pack real workload shapes under scheduler constraints. Validate discrete placement, rollout surge, and one-node loss in addition to aggregate CPU and memory. The best node is the one that fits the production workload safely, not the one with the lowest advertised unit price.

## Official Documentation

- [Kubernetes: Reserve compute resources for system daemons](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/)
- [Kubernetes: Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Pod overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes: Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes Cluster Autoscaler FAQ](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md)
