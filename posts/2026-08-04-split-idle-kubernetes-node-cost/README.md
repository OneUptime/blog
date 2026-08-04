# Split Kubernetes Idle Cost into Headroom, Overhead, and Waste

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Showback, FinOps, Idle Cost, Capacity Planning, OpenCost, Amazon EKS

Description: Reconcile node cost into tenant workloads, platform overhead, intentional headroom, and avoidable waste without double allocating shared capacity.

---

Calling every unallocated Kubernetes node dollar *idle* creates the wrong conversation. Some spare capacity is intentional headroom for failover and bursts. Some capacity runs platform agents or is reserved for the operating system and Kubernetes daemons. The remaining residual may be avoidable waste.

Those categories require different owners and actions. Build them from one reconciled node-cost equation rather than three independent estimates.

## Establish the Asset Cost Boundary

Start with the selected economic cost of each node for a short interval. Use the billing-aware amount: On-Demand unblended cost, RI effective cost, Savings Plan effective cost, or the corresponding net basis. Include node-attached cost only when the model explicitly treats it as part of the node asset.

Then enforce:

```text
node_asset_cost
  = tenant_workload_cost
  + platform_capacity_cost
  + intentional_headroom_cost
  + waste_cost
  + unresolved_cost
```

Every dollar appears once. `Unresolved` is allowed during data-quality work; a hidden plug is not.

OpenCost uses a related boundary: workload cost plus cluster idle cost plus overhead equals total cluster cost. AWS split cost allocation provides Pod split costs and a Pod-level `split_line_item_unused_cost`; AWS proportionately applies the parent instance's unused capacity cost to Pods using their split usage. If you aggregate that field back to the parent before reclassifying it, your subdivision into headroom and waste is a FinOps policy, not an AWS classification.

## Identify Tenant Workload Cost

Calculate direct workload cost with the chosen model, such as requests or `max(request, usage)`, at container and interval grain. Aggregate only after assigning:

- cluster ID;
- node or parent resource ID;
- namespace and workload;
- Pod UID;
- tenant versus platform classification;
- CPU, memory, and accelerator component.

AWS split cost rows expose `split_line_item_parent_resource_id`, `split_line_item_split_cost`, and `split_line_item_unused_cost`. If the goal is to show unused cost separately, do not first add the AWS unused field to each Pod's direct workload cost. OpenCost exposes workload allocations and an optional `__idle__` result. Do not combine the AWS unused field and the OpenCost idle field as two costs; they are alternate calculations unless a documented reconciliation says otherwise.

## Pull Platform Capacity Out Before Calling It Idle

Platform capacity includes observable workloads such as:

- networking, DNS, storage, ingress, security, and observability agents;
- `kube-system` controllers and add-ons;
- DaemonSets that run once per eligible node;
- platform workloads in dedicated namespaces;
- capacity excluded from Pod scheduling for the operating system, Kubernetes daemons, and eviction thresholds.

Kubernetes Node Allocatable represents resources available to Pods after configured reservations. Those reservations can consume paid node capacity even though no tenant Pod receives it.

Classify platform Pods with the same CPU and memory method as tenant Pods. Model non-Pod reserved capacity from node capacity and allocatable inventory only if the selected source has not already placed it in unused cost. Record the method because cloud billing does not label a portion of an EC2 instance as `kube-reserved`.

Avoid rules such as `namespace starts with kube = free`. Platform cost is still part of total cluster economics even if it is centralized.

## Calculate the Residual Once

At node or node-pool interval grain:

```text
raw_unallocated_cost
  = node_asset_cost
  - tenant_workload_cost
  - platform_capacity_cost
```

Investigate a materially negative result. It often means:

- workload usage was counted at multiple scrape points;
- CPU and memory weights exceed the asset cost;
- a parent node was joined to multiple identities;
- the same platform reservation was modeled twice;
- cost and telemetry intervals are misaligned.

Do not force the value to zero before finding the cause.

## Define Intentional Headroom

Headroom is spare capacity approved for a purpose, such as:

- surviving a node or Availability Zone failure;
- accommodating Horizontal Pod Autoscaler growth while new nodes launch;
- rolling upgrades and Pod disruption constraints;
- queue latency targets for batch work;
- scheduled demand peaks;
- capacity that cannot be acquired instantly.

Store a capacity policy by cluster or node pool:

```text
pool_id
resource_type
effective_from
effective_to
approved_buffer_units
reason
approver
policy_version
```

Convert approved buffer units to cost with the same CPU, memory, and accelerator rates used for the asset. Then cap intentional headroom at the actual residual:

```text
intentional_headroom_cost
  = min(raw_unallocated_cost, approved_buffer_cost)

waste_cost
  = raw_unallocated_cost - intentional_headroom_cost
```

Apply the minimum per resource component and interval, not just at a monthly dollar total. Otherwise excess memory could incorrectly satisfy a CPU failover requirement.

Headroom above the approved buffer is waste under this reporting policy. An approved buffer that was not available is a resilience shortfall, not a negative cost.

## Work Through a Reconciled Example

A node pool costs $100 for the reporting interval:

- tenant workload allocations: $55;
- measured platform Pods and reserved capacity: $15;
- raw unallocated capacity: $30;
- approved, actually available headroom: $20;
- waste: $10.

The control is:

```text
$100 = $55 + $15 + $20 + $10
```

If leadership distributes all four categories to teams, retain the categories after distribution. A team should be able to see that $6 was direct workload, $2 was platform, and $1 was resilience headroom rather than receiving an unexplained $9 blended total.

## Choose Owners and Drivers

Reasonable defaults are:

| Category | Default owner | Optional distribution driver |
| --- | --- | --- |
| Tenant workload | Workload owner | direct requests or usage |
| Platform capacity | Platform team | tenant direct cost, namespaces, or custom benefit metric |
| Intentional headroom | Platform or resilience budget | requested baseline, failure-domain footprint, or equal pool share |
| Waste | Capacity owner | causation analysis before distribution |

The platform may choose to show all shared categories centrally. If it distributes them, OpenCost supports proportional shared and idle allocation, but that behavior is a choice. OpenCost's Allocation API leaves idle separate by default and can distribute it with `shareIdle=true`.

Do not automatically distribute waste in proportion to direct cost and then tell the largest tenant it caused the waste. The cause may be node-pool fragmentation, topology constraints, DaemonSet footprint, autoscaler settings, or an approved minimum node count.

## Make the Report Actionable

For each pool, show:

- paid node cost and selected cost basis;
- tenant, platform, headroom, waste, and unresolved amounts;
- request and usage utilization by resource;
- approved headroom target and actual available headroom;
- fragmentation indicators by node shape and scheduling constraint;
- allocation and policy versions;
- data coverage.

Tie actions to categories: rightsize tenant requests, reduce DaemonSet footprint, revise the resilience target, change node shapes, improve autoscaler configuration, or accept a documented cost.

## Validate the Split

- Categories sum to the node asset cost at interval and month grain.
- Platform Pods are not also included in tenant cost.
- Node reservations are not added when the source already treats them as unused.
- Headroom never exceeds the actual resource-specific residual.
- CPU headroom cannot offset memory waste or vice versa without an explicit cost conversion.
- Negative residuals fail the run or enter an exception queue.
- Distribution weights sum to one and retain the original category.
- AWS split cost and OpenCost idle are not added together as independent charges.

## Official Documentation

- [OpenCost: Workload, shared, idle, and overhead cost specification](https://opencost.io/docs/specification/)
- [OpenCost: Allocation API idle controls](https://opencost.io/docs/integrations/api/)
- [AWS Data Exports: Understanding split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html)
- [AWS Data Exports: Split line item cost and unused-cost columns](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-split-line-item.html)
- [Kubernetes: Reserve compute resources for system daemons](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/)
- [Kubernetes: Resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: DaemonSet workloads](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)

## Conclusion

Idle is a residual, not an owner. First subtract tenant and platform capacity from reconciled node cost. Then cap intentional headroom at an approved, resource-specific buffer and label the remainder as waste or unresolved. Keeping these categories separate gives platform and application teams the right action without inventing AWS billing semantics.
