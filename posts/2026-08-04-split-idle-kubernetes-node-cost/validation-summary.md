# Validation Summary: Split Kubernetes Idle Cost into Headroom, Overhead, and Waste

## Status
validated

## Post Type
Technical guide / FinOps methodology

## Technologies Covered
- Kubernetes node capacity and Node Allocatable
- Kubernetes resource requests and usage
- Kubernetes DaemonSets and platform workloads
- OpenCost specification and Allocation API
- AWS Data Exports / Cost and Usage Report (CUR 2.0)
- Amazon EKS split cost allocation data
- Reserved Instance and Savings Plans effective costs
- Kubernetes showback, capacity planning, and FinOps

## Sources Consulted
- [OpenCost Specification](https://opencost.io/docs/specification/) - workload, idle, shared, overhead, and total-cluster cost definitions.
- [OpenCost Allocation API](https://opencost.io/docs/integrations/api/) - `includeIdle`, `shareIdle`, `idleByNode`, and the `__idle__` allocation behavior.
- [AWS Data Exports: Understanding split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html) - EKS Pod-level allocation, CPU and memory records, accelerator records, and EKS cost-allocation tags.
- [AWS Data Exports: Split line item columns for CUR 2.0](https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-split-line-item.html) - `split_line_item_parent_resource_id`, `split_line_item_split_cost`, `split_line_item_unused_cost`, and related field semantics.
- [AWS Data Exports: Split line item details](https://docs.aws.amazon.com/cur/latest/userguide/split-line-item-columns.html) - allocation and proportional application of unused cost to Pods.
- [AWS Data Exports: Example of split cost allocation data](https://docs.aws.amazon.com/cur/latest/userguide/example-split-cost-allocation-data.html) - `max(reserved, actual)` allocation, instance residual calculation, and split-cost reconciliation.
- [Kubernetes: Reserve Compute Resources for System Daemons](https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/) - Node Allocatable, `kubeReserved`, `systemReserved`, and eviction thresholds.
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) - requests, limits, scheduling, and usage semantics.
- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/) - node-scoped platform workload behavior.

## Issues Found
1. **Reserved-capacity treatment could misclassify platform cost or cause a double count.** The post said to model non-Pod reserved capacity only when the selected source had not already placed it in unused cost. A billing allocation can include that capacity in its unused amount, but the methodology still needs to classify the reserved portion as platform capacity. Changed the guidance to reclassify the matching amount out of unused instead of adding a second cost.
2. **The headroom equations did not account for `unresolved_cost`.** The top-level reconciliation allowed an unresolved category, but the later equations allocated the entire raw residual to headroom and waste. Added `classifiable_residual_cost = raw_unallocated_cost - unresolved_cost` and applied the headroom cap and waste calculation to that amount, preserving the stated one-dollar-once invariant.
3. **The resource-specific validation rule had an incorrect cost-conversion exception.** Converting CPU and memory quantities to dollars does not make those resources interchangeable for a resource-specific resilience requirement. Removed the exception so CPU headroom cannot satisfy a memory target, or vice versa.
4. **The OpenCost API default was described imprecisely.** The Allocation API does not return idle by default because `includeIdle` defaults to `false`. Updated the post to explain that, when idle is included, the default `shareIdle=false` behavior keeps it in a separate `__idle__` allocation and `shareIdle=true` distributes it.

## Review Notes
- The post's equations are policy/accounting pseudocode rather than executable source code; their arithmetic and reconciliation behavior were checked directly.
- The OpenCost specification supports the stated `max(request, usage)` workload model and defines total cluster cost as workload cost plus cluster idle cost plus cluster overhead cost.
- The OpenCost Allocation API currently defaults both `includeIdle` and `shareIdle` to `false`; when idle is included but not shared, it is returned as a separate `__idle__` allocation. With `shareIdle=true`, idle is distributed proportionally and separately by resource.
- AWS documents `split_line_item_*` as the CUR 2.0 column names. Legacy CUR presents the same concepts as `splitLineItem/*`; the names used in the post are correct for the linked CUR 2.0 table dictionary.
- AWS split cost allocation's unused-cost field is proportionately applied to Pods based on split usage. Treating the aggregated parent-level unused amount as headroom, waste, or reclassified platform reservation remains an internal FinOps policy, as the post states.
- Kubernetes documents Node Allocatable as the resources available to Pods after relevant system and Kubernetes reservations and eviction allowances. The post correctly treats those paid but non-Pod-schedulable resources as a separate modeling concern.
- All cited documentation URLs resolve to the intended current official pages. No version-specific deprecations were found.
