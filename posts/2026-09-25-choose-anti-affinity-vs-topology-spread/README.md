# How to Choose Pod Anti-Affinity vs Topology Spread Constraints for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, High Availability, Scheduling, Topology Spread

Description: Choose between absolute pod separation and balanced replica distribution by testing capacity limits, failure domains, and rollout behavior.

---

Choose required pod anti-affinity when selected pods must not share a failure domain. Choose topology spread when selected pods may share domains but their counts should remain balanced. The distinction matters during scaling: a rule that safely separates three replicas can prevent a fourth from ever starting.

Before writing YAML, state the failure requirement numerically. For example: “Six API replicas should remain evenly distributed across three zones, and losing one node should not remove all replicas in a zone.” That is more useful than an unspecified requirement to spread pods.

## Compare the scheduling contracts

| Requirement | Appropriate mechanism | What happens when capacity is insufficient? |
| --- | --- | --- |
| At most one selected replica per host | Required pod anti-affinity on hostname | Extra replicas remain pending |
| Prefer different hosts | Preferred pod anti-affinity | Co-location is allowed |
| Balance replica counts across zones | Topology spread with `DoNotSchedule` | Placements violating the allowed skew are rejected |
| Prefer balanced placement but allow imbalance | Topology spread with `ScheduleAnyway` | Distribution influences scoring |

Neither preference guarantees its desired placement. Hard rules can preserve a placement requirement by leaving pods pending, which may be less desirable than reduced separation during an outage. Make that tradeoff explicit with the application owner.

Kubernetes documents [pod affinity and anti-affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/) separately from [topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/) because they express different relationships.

## Use anti-affinity for an actual exclusion

This pod-template fragment prohibits another matching ledger replica on the same host:

```yaml
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: ledger
        topologyKey: kubernetes.io/hostname
```

Put `app: ledger` on the pod template and place this fragment under `.spec.template` for a Deployment. With three eligible hosts, three matching replicas can fit; a fourth needs another eligible host. Anti-affinity does not itself create that host.

Namespace selection also matters. Without an explicit namespace scope, the anti-affinity term considers the pod's own namespace. Avoid selectors so broad that unrelated services exclude each other accidentally.

Do not assume the same required rule can use a zone key in every cluster. The `LimitPodHardAntiAffinityTopology` admission controller, when enabled, restricts required pod anti-affinity to `kubernetes.io/hostname`. Check your cluster policy before relying on required zone anti-affinity.

## Use spread when multiple replicas per domain are expected

For six API replicas across three eligible zones, use a stable shared label:

```yaml
spec:
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: checkout
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        app: checkout
```

This makes zone balance a requirement and host balance a preference. Assuming all three zones are eligible and have room, six replicas can reach a 2/2/2 distribution. Required zone anti-affinity would instead permit only one matching pod per zone.

For hard spread, `maxSkew` is evaluated against the global minimum across eligible domains, subject to `minDomains` if configured. It is not a per-node replica maximum, a resource-balancing rule, or a guarantee that three zones exist. Inspect node labels and eligibility rather than assuming the cloud region's zone count is the scheduler's domain count.

## Account for rollout surge before enforcing separation

A Deployment with three replicas, three hosts, required hostname anti-affinity, `maxSurge: 1`, and `maxUnavailable: 0` can stall: the new replica cannot co-locate, while the controller preserves all old replicas until a replacement becomes available.

Possible designs include adding a fourth eligible host, permitting a controlled unavailable replica, or using a selector that intentionally separates revisions. The last option changes the availability contract because old and new versions may share a host. Review the [Deployment rolling update behavior](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) before making that choice.

A PodDisruptionBudget does not replace the Deployment's rollout settings. Budgets constrain supported voluntary evictions; they do not guarantee placement or prevent every disruption. Kubernetes explains those boundaries in its [disruptions documentation](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/).

## Test the policy against failures

Use a staging cluster with the same node labels and pool constraints. Check these cases:

1. The normal replica count with all intended domains available.
2. One additional replica during a rollout or autoscaling burst.
3. One host unavailable while replacements are created.
4. One zone unavailable, including the resulting topology-domain eligibility.
5. CPU or memory exhaustion in the least-populated domain.

For each case, record ready replica count, pending reasons, placement, and recovery time. Do not infer zone-failure behavior from a normal-state 2/2/2 screenshot.

Combining required host anti-affinity with hard zone spread is valid when both requirements are intentional, but every new pod must satisfy both. Start from the minimum rules that express the service's availability needs, then verify the real rollout and failure behavior before tightening them.
