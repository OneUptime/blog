# How to Set Headroom for Growth, Maintenance, and One-Node Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Reliability, Scalability, Site Reliability Engineering, Performance

Description: Convert a tested unit capacity and demand forecast into explicit growth, maintenance, and failure reserves without hiding assumptions in one utilization percentage.

---

Headroom is capacity held for a stated event. A blanket rule such as keeping CPU below 60 percent mixes unrelated risks and often fails when replicas are uneven, nodes differ in size, or a maintenance event overlaps a failure.

Build the reserve from a demand forecast, a tested service capacity, and explicit outage scenarios.

## Establish the demand and supply units

Forecast the busiest relevant interval, not the daily average. Include organic growth and known inorganic changes such as launches or migrations. Keep a central estimate and a higher planning bound:

```text
current peak                 14,500 RPS
organic growth to horizon       15%
known launch uplift              8%
forecast planning peak       18,009 RPS
```

Here the uplifts compound: `14,500 * 1.15 * 1.08 = 18,009`. Do not add another generic growth margin later unless it covers a different uncertainty.

Measure each instance's SLO-safe production-mix capacity through load testing. If an instance safely handles 900 RPS, demand capacity is:

```text
N_demand = ceil(18,009 / 900) = 21 instances
```

Use a conservative lower-tail tested capacity across representative hosts when variance is material. A mean alone can leave a substantial share of instances weaker than the planning assumption, and it does not quantify that share without the measured distribution.

## Model unavailable capacity directly

List the units removed by each credible event:

```text
rolling maintenance batch          1 node = 4 instances
largest single-node failure        1 node = 4 instances
largest zone failure               8 instances
autoscaling and readiness lead time 5 minutes
```

Decide which events must overlap. Google SRE's production guidance gives an N+2 example in which peak load remains serviceable during one task update plus one machine failure. If this is your policy and each node carries four instances:

```text
required instances = N_demand + maintenance loss + node loss
                   = 21 + 4 + 4
                   = 29
required nodes     = ceil(29 / 4) = 8 nodes
```

Eight nodes provide 32 slots. With all 32 slots running ready service instances before the event, one maintenance node and one failed node leave 24 ready instances, enough for the 21-instance demand. Empty slots require scheduling and startup time before they can serve traffic.

If zone failure is the required scenario, calculate it separately instead of adding every possible event together. Adopt the largest approved coincident scenario, unless policy explicitly requires maintenance during a zone loss.

## Check placement, not only totals

A total of 32 replica slots is useful only if work can reach them. Verify:

- replicas spread across nodes and zones;
- load balancing continues after health checks remove a node;
- shards, leaders, and volumes can move or fail over;
- PodDisruptionBudgets allow the maintenance action while preserving service;
- quotas, IP addresses, and dependency pools support the surviving load;
- each remaining instance stays below its tested safe rate.

At 18,009 RPS across 24 survivors, each instance receives about 750 RPS, below the 900 RPS tested boundary. With skew, the busiest instance may be higher, so test the actual balancing distribution.

## Separate static reserve from elastic reserve

Elastic capacity is useful only if it arrives before the service exhausts existing headroom. Measure the complete delay:

```text
detection + metric window + autoscaler decision + provisioning
+ image pull + startup + readiness + load-balancer registration
```

If demand can grow faster than this delay, keep enough ready capacity for the burst or pre-scale before predictable events. Do not count a cloud quota as ready headroom. A quota only permits an allocation; it does not prove that instances, IPs, volumes, or nodes will become available in time.

In Kubernetes, low-priority overprovisioning pods can reserve schedulable space while still allowing useful workloads to preempt it. The resulting pending replacement placeholder pods can prompt Cluster Autoscaler to replenish the reserve, provided their priority is at or above its configured expendable-pod priority cutoff (default `-10`) and below the service pods they reserve space for. This is a scheduling technique, not free compute: running nodes are still billed.

## Express headroom in operational views

Track both workload and failure-domain headroom:

```text
service headroom RPS = surviving tested capacity - forecast peak
node headroom count  = ready nodes - policy loss nodes - ceil(N_demand / instances_per_node)
time headroom        = time until forecast demand reaches safe capacity
```

Alert on the scenario result, not only average CPU. A deployment can have 35 percent cluster-wide CPU and still lack one-node-failure capacity because of a hot shard or a restrictive placement rule.

Review the model when any input changes: workload mix, code efficiency, instance type, node density, maintenance batch, autoscaler lead time, failure policy, or growth forecast. Compare past forecasts with actual demand and retain forecast error as an explicit uncertainty input.

## Exercise the policy

Run a production-shaped load test at the planning peak while draining one node and making another unavailable, or exercise the equivalent safely in a representative environment. Verify latency, errors, queue bounds, disruption behavior, and recovery.

Document ownership and expiry:

```yaml
forecast_horizon: 2026-12-01
safe_instance_capacity_rps: 900
demand_instances: 21
maintenance_loss_instances: 4
failure_loss_instances: 4
required_nodes: 8
next_review: 2026-10-01
```

Headroom without a review date tends to become either permanent waste or an obsolete safety claim.

## Conclusion

Set headroom by naming the demand, failure, maintenance, and timing assumptions. Convert forecast peak demand through a tested unit capacity, add only the coincident losses the reliability policy requires, and verify placement plus scaling lead time. Test the resulting failure scenario so reserved capacity is proven rather than merely counted.

## Official Documentation

- [Google SRE Book: Production Services Best Practices](https://sre.google/sre-book/service-best-practices/)
- [Google SRE Book: The Production Environment at Google](https://sre.google/sre-book/production-environment/)
- [Google SRE Book: Introduction to demand forecasting and capacity planning](https://sre.google/sre-book/introduction/)
- [Kubernetes Pod topology spread constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [Kubernetes PodDisruptionBudgets](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Cluster Autoscaler FAQ: overprovisioning](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#how-can-i-configure-overprovisioning-with-cluster-autoscaler)
