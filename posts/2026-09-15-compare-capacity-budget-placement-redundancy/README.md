# How to Compare Capacity Plans When Budget, Placement, and Redundancy Constraints Conflict

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Cost Optimization, High Availability, Resource Planning, Kubernetes

Description: Compare capacity alternatives by proving budget, per-node placement, and failure constraints before ranking cost or efficiency.

---

A cheap cluster may have enough aggregate CPU while lacking a valid home for the largest Pod. Another option may fit every Pod during normal operation but fail after one node disappears. These are feasibility failures, not small disadvantages to average away in a score.

Make mandatory constraints explicit, eliminate infeasible alternatives, and only then compare cost and operational tradeoffs.

## Express demand in deployable units

List the simultaneous workload inventory, including ordinary replicas, the required rollout surge, background agents, and any maintenance overlap. Use effective Pod requests for Kubernetes placement and measured service behavior to confirm those requests are sufficient for the latency objective.

For a deliberately small example, twelve identical Pods each require 4 vCPU and 8 GiB. Each node has 16 vCPU and 32 GiB available to this workload after all host and DaemonSet reservations. A Pod fits four times on one node. These are already usable values, so do not subtract the same reservations again.

Kubernetes scheduling considers both resource requirements and placement constraints. A Pod requiring a particular label cannot use an otherwise empty node outside that eligible set. [Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)

## Separate normal and degraded feasibility

For the twelve-Pod example, three nodes have exactly twelve slots. Losing one leaves eight slots. Four nodes leave twelve slots after one loss and therefore pass this simple one-node-failure capacity screen.

A two-zone layout adds another question. Four nodes split evenly across two zones leave only eight slots after losing one zone. Six nodes split three per zone leave twelve. State which failure is required; “redundant” is too vague to determine a quantity.

This arithmetic assumes stateless Pods can move freely among surviving nodes and dependencies remain available. Storage topology, spread constraints, special hardware, IP capacity, and attachment limits can invalidate that assumption.

## Evaluate alternatives with a small executable model

Suppose planning quotes assign 240 cost units per month to the 16-vCPU node and 150 to an 8-vCPU, 16-GiB node. These are fictional comparison inputs, not cloud prices. The smaller node fits two of the example Pods. Evaluate equal node counts in two zones, requiring the full workload to fit after either zone fails:

```python
from itertools import product

pod_count = 12
budget = 2000
shapes = {
    'large': {'slots': 4, 'cost': 240},
    'small': {'slots': 2, 'cost': 150},
}
feasible = []
for large, small in product(range(7), repeat=2):
    # Counts are per zone; both zones use the same layout.
    surviving_slots = large * shapes['large']['slots'] + small * shapes['small']['slots']
    monthly_cost = 2 * (large * shapes['large']['cost'] + small * shapes['small']['cost'])
    if surviving_slots >= pod_count and monthly_cost <= budget:
        feasible.append((monthly_cost, large, small, surviving_slots))

for row in sorted(feasible)[:3]:
    print(row)
# (1440, 3, 0, 12)
# (1560, 2, 2, 12)
# (1680, 1, 4, 12)
```

The cheapest enumerated feasible option is three large nodes per zone. This is an exhaustive result only for the bounded symmetric layouts and assumptions encoded here. It does not establish the best production architecture.

For an 18 GiB Pod, the smaller node fits zero even though multiple small nodes have enough total memory. Replace the simple slot model with resource vectors and explicit per-node assignments for mixed workloads. In larger models, an integer constraint solver such as CP-SAT can represent placement and cost; distinguish a feasible solution from a proven optimum when the solver stops early. [Google OR-Tools CP-SAT](https://developers.google.com/optimization/cp/cp_solver)

## Preserve the constraints in the comparison

Create one row per alternative and report whether each required condition passes:

| Alternative | Monthly cost units | Normal twelve-Pod fit | One-node loss | One-zone loss |
| --- | ---: | --- | --- | --- |
| Four large nodes, two per zone | 960 | Pass | Pass | Fail |
| Six large nodes, three per zone | 1,440 | Pass | Pass | Pass |
| Twelve small nodes, six per zone | 1,800 | Pass | Pass | Pass |

The cheaper first option cannot compete as an equivalent plan if one-zone survival is mandatory. If the budget were 1,200, none of these would satisfy the full requirement. Report the conflict directly and evaluate another architecture, workload change, budget, or an explicitly revised availability requirement.

Do not assume topology spread reserves spare resource slots. It constrains placement using matching Pod counts and eligible domains. Reevaluate the actual rules under failures and surges. [Kubernetes topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)

## Stress the uncertain inputs

Repeat the calculation with forecast error, higher requests after a release, delayed replacement nodes, one extra DaemonSet, and rollout overlap. Keep at least one test containing the largest indivisible workload. If two alternatives are close in cost, compare their sensitivity to these changes rather than presenting a false precision in monthly savings.

Include network, storage, licenses, support, migration overlap, and operating effort when moving from a node-only estimate to total cost. Record resource supply dates when an option depends on new hardware or quota approval.

Finally, validate the selected assignment in a representative environment and run the service's degraded-capacity load test. A placement proof establishes that the modeled resources fit; a load test establishes whether the application meets its objectives there. The decision needs both pieces of evidence.
