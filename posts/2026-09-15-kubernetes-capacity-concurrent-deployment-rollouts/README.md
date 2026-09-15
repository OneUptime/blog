# How to Calculate Kubernetes Capacity for Concurrent Deployment Rollouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Capacity Planning, DevOps, Scalability, Monitoring

Description: Sum per-deployment surge and terminating-pod demand, then verify node placement and service capacity during overlapping rollouts.

---

A cluster can have enough resources for every Deployment at steady state and still stall when several teams release at once. Each Deployment has its own surge allowance. The scheduler sees their combined demand, while terminating Pods may continue holding resources and database connections.

Build the rollout budget across the set of changes allowed to overlap. Resource totals are the first check; node placement and serving capacity are separate checks.

## Inventory the rollout population

For each Deployment, collect:

- desired replicas during the rollout, including possible HPA growth;
- `maxSurge` and `maxUnavailable`;
- old and new Pod resource requests;
- sidecar, init-container, and runtime overhead requirements;
- expected and conservatively allowed terminating-Pod overlap;
- eligible node pools, zones, and storage requirements.

A percentage `maxSurge` rounds up, while percentage `maxUnavailable` rounds down. Kubernetes also documents that terminating Pods can consume resources beyond the ordinary `replicas + maxSurge` population. [Kubernetes Deployment strategy](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/).

Use explicit values from the actual manifests, not assumed defaults. A Deployment whose replica count is three has a surge of one at 25%, not 0.75 of a Pod.

## Sum the independent surge allowances

Consider three Deployments whose old and new Pod requests are unchanged. Resource figures include their regular sidecars; no additional init-container or runtime overhead applies in this simplified example.

| Deployment | Replicas | Surge policy | Surge Pods | CPU per Pod | Memory per Pod |
| --- | ---: | --- | ---: | ---: | ---: |
| API | 12 | 25% | 3 | 0.5 | 0.5 GiB |
| Search | 8 | 50% | 4 | 1 | 2 GiB |
| Reports | 3 | 1 Pod | 1 | 2 | 4 GiB |

The steady total is:

```text
Pods   = 12 + 8 + 3 = 23
CPU    = 12 * 0.5 + 8 * 1 + 3 * 2 = 20
memory = 12 * 0.5 + 8 * 2 + 3 * 4 = 34 GiB
```

When all three surge concurrently:

```text
extra CPU    = 3 * 0.5 + 4 * 1 + 1 * 2 = 7.5
extra memory = 3 * 0.5 + 4 * 2 + 1 * 4 = 13.5 GiB

steady plus surge = 31 Pods, 27.5 CPU, 47.5 GiB
```

Applying a single 25% factor to the cluster would miss Search's 50% policy and the per-Deployment rounding.

Reproduce the calculation:

```python
from math import ceil

workloads = [
    # name, replicas, surge Pods, CPU, memory GiB
    ('api', 12, ceil(12 * 0.25), 0.5, 0.5),
    ('search', 8, ceil(8 * 0.50), 1.0, 2.0),
    ('reports', 3, 1, 2.0, 4.0),
]
for label, count in [
    ('steady', lambda n, s: n),
    ('steady plus surge', lambda n, s: n + s),
    ('plus one old terminating generation', lambda n, s: 2 * n + s),
]:
    pods = sum(count(n, s) for _, n, s, _, _ in workloads)
    cpu = sum(count(n, s) * c for _, n, s, c, _ in workloads)
    memory = sum(count(n, s) * m for _, n, s, _, m in workloads)
    print(label, pods, cpu, memory)
```

## Add terminating Pods and changed requests

Let `T_i` be the allowed extra terminating Pods for Deployment `i`. With unchanged requests, the planning envelope becomes:

```text
resource demand = sum((replicas_i + surge_i + T_i) * pod_request_i)
```

If the plan conservatively allows a whole old generation to remain terminating for every rollout, set `T_i = replicas_i`. The example envelope becomes 54 Pods, 47.5 CPU, and 81.5 GiB. This is a deliberately conservative allowance for one replacement generation, not a claim that every rollout reaches that count.

Repeated revisions or rapid scale cycles can accumulate more terminating work. Serialize revisions until prior termination completes, or explicitly include additional overlap in the budget. A measured typical value of `T_i` is useful for cost estimates but should not silently become a hard guarantee.

If a new release changes requests, calculate old, new, and terminating populations separately over the rollout sequence. A simple upper bound can use the larger old/new request for each resource, but it may overestimate capacity significantly. Charge old terminating Pods their actual old request; using the new request would understate demand when the old Pod was larger.

## Translate resources into feasible placement

Suppose each eligible node has 7 CPU and 14 GiB available for this application set after other workloads and reservations. The conservative envelope implies:

```text
CPU node lower bound    = ceil(47.5 / 7)  = 7
memory node lower bound = ceil(81.5 / 14) = 6
```

At least seven such nodes are needed by aggregate CPU. That does not prove seven nodes can place every Pod: CPU and memory must fit together on the same eligible nodes. Recheck topology spread, anti-affinity, taints, node selectors, Pod slots, IPs, and volumes. Kubernetes schedules from requests rather than current low utilization. [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/).

Include DaemonSet requests on newly added nodes and any runtime overhead not already counted. If nodes must be provisioned, compare their measured startup time with the allowed rollout duration and traffic headroom.

## Check availability independently of resource space

Enough space for surge Pods does not mean enough ready service capacity during replacement. For each Deployment, verify that its permitted unavailable count still leaves the throughput required at peak traffic. Include readiness, `minReadySeconds`, slow connection draining, and the new release's cache warmup.

A PodDisruptionBudget does not constrain a Deployment controller's rolling-update strategy; configure rollout availability using the workload's own update settings. PDBs address supported eviction-driven disruptions, so they cannot replace this calculation. [Kubernetes disruptions and rollout behavior](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/).

Database connections, load-balancer targets, and downstream quotas also grow with overlapping old and new processes. Include them in the admission decision even if CPU and memory fit.

## Control concurrency when the combined plan does not fit

Without terminating overlap, serializing the example releases reduces the largest surge increment to Search's 4 CPU and 8 GiB, producing 24 CPU and 42 GiB rather than 27.5 CPU and 47.5 GiB. Include termination before choosing the final serial envelope, and wait for the prior release's terminating Pods to finish before reusing its reserve.

A release gate can admit a rollout only when its calculated resource increment fits the remaining budget for the eligible pools. Alternatively, reserve more nodes, lower selected surge counts, or schedule high-demand releases separately. Rehearse the selected concurrent set in staging and record pending-Pod reasons, resource requests, ready replicas, service latency, and actual termination overlap. The result is a rollout concurrency policy supported by a capacity calculation rather than by whichever release reaches the scheduler first.
