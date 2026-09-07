# Adding Headroom Without Preserving Chronic Waste

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rightsizing, Capacity Planning, Performance, Cost Optimization

Description: Build headroom from measured growth, variance, recovery, and scaling delay instead of carrying forward an arbitrary percentage of oversized capacity.

---

Headroom protects a workload from uncertainty. It should not protect unused capacity from scrutiny. Applying 30 percent to the current machine simply turns historical oversizing into a larger recommendation.

Start from measured demand, state why each buffer exists, and remove buffers when another control reliably handles the risk.

## Separate the headroom components

Use a baseline and four explicit reserve components rather than one unexplained multiplier:

```text
baseline demand: selected statistic from a representative window
growth reserve: forecast demand until the next review or scale event
variance reserve: unexplained but repeatable variation
recovery reserve: failover, rebuild, retry, and maintenance demand
reaction reserve: load arriving before autoscaling or an operator responds
```

A transparent additive model is easy to review:

```text
recommended capacity = baseline
                     + growth reserve
                     + variance reserve
                     + recovery reserve
                     + reaction reserve
```

Do not add the same risk twice. If the selected P99 already contains routine bursts, a separate routine-burst percentage duplicates them. If capacity is duplicated across zones for an N+1 requirement, do not also add a full failover reserve to every replica unless the topology needs both.

## Derive buffers from evidence

### Growth

Estimate growth from a business driver such as requests, active tenants, records, or jobs. If demand is growing 3 percent per month and the next review is in two months, reserve roughly the forecasted increase plus forecast error. Shorten the review interval rather than buying a year of headroom for a workload that can resize safely each month.

### Variance

Compare equivalent periods. The spread of weekly P99 demand or job maxima is more useful than the variance of every raw sample. Investigate releases, hot tenants, and data skew before labeling variation as random.

### Recovery

Measure cache warmup, replica catch-up, compaction, backup, and failover. Recovery capacity belongs in the model when the recovery-time objective depends on it. It can sometimes be provided by temporary autoscaling or a separate worker pool instead of permanent capacity.

### Reaction time

For approximately linear growth, estimate the increase in resource demand before new capacity is usable. Express the growth rate in capacity units per unit time, such as CPU cores per minute, and latency in matching time units:

```text
reaction reserve = demand growth rate * end-to-end scale latency
```

For abrupt or nonlinear increases, use the measured demand increase over the reaction window instead. End-to-end latency includes metric delay, evaluation, provisioning, image pulls, startup, readiness, and load-balancer registration. Measuring only the cloud API launch time understates it.

## Use asymmetric CPU and memory policies

CPU shortages usually appear as throttling, queueing, and latency. A CPU buffer can be smaller when the workload sheds load, has a queue, or scales quickly. It must be larger when there is one replica, long startup, or a tight synchronous latency objective.

Memory exhaustion can terminate a process. Size memory from working-set peaks plus native, kernel-accounted, cache, and diagnostic needs not already included in that metric. Keep the request and limit policy distinct: a scheduler request expresses placement need, while a hard limit defines an enforcement boundary.

AWS Compute Optimizer exposes this asymmetry in its configurable preferences. For EC2 instance recommendations, it offers independent CPU and memory headroom and uses 20 percent for each in its documented default preset. Treat those values as provider defaults, not proof for a particular application.

## Put a ceiling on unexplained headroom

Create a policy that requires evidence when buffers exceed a threshold:

```yaml
headroom:
  growth_percent: 8
  variance_percent: 6
  recovery_cpu_cores: 0.5
  reaction_cpu_cores: 0.3
  unexplained_percent: 0
review_in_days: 30
owner: payments-platform
```

An unexplained buffer should be temporary, owned, and dated. Chronic uncertainty is an observability or resilience problem, not a permanent sizing category.

## Example calculation

A worker has a P99 demand of 3.2 CPU cores. Traffic growth until the next review contributes 0.2 core. Week-to-week variation contributes 0.3, and queue-based autoscaling needs 0.4 core during its measured reaction time. A retry storm is already represented in P99, so it gets no separate buffer.

```text
3.2 + 0.2 + 0.3 + 0.4 = 4.1 cores
```

Choose the next feasible shape only after checking memory, network, storage, and licensing. Record the rounding overhead separately so it is visible rather than mistaken for application headroom.

## Validate that the buffer works

Before broad rollout, replay normal load, the chosen peak, a dependency slowdown, and a failover. Observe:

- service latency and error objectives;
- CPU throttling and run queue;
- memory working set, OOM events, and reclaim;
- autoscaling reaction and pending capacity;
- queue age and retry amplification;
- database and storage latency.

Set a consumption alert on each buffer. If baseline demand repeatedly enters the growth reserve, bring the review forward. If a buffer remains untouched across several representative cycles, reassess it and reduce or reclassify it only when its risk is no longer present or another tested control covers it. Keep required failover and recovery reserves even when no failure occurred during the observation window.

## Prefer elasticity for rare, schedulable peaks

Permanent headroom is appropriate for sudden demand that must be served immediately. Scheduled scale-up is often better for known billing runs. Horizontal scaling works for divisible services. Queueing works for delay-tolerant jobs. Load shedding protects critical operations when optional work can be rejected.

The least expensive safe design often combines a modest steady buffer with a tested elastic path.

## Conclusion

Calculate headroom from baseline demand plus named growth, variance, recovery, and reaction reserves. Avoid double-counting peaks, use stricter rules for non-compressible memory, and require every unexplained buffer to have an owner and expiry. Test the resulting capacity under real failure and scaling conditions.

## Official Documentation

- [AWS Compute Optimizer rightsizing preferences](https://docs.aws.amazon.com/compute-optimizer/latest/ug/rightsizing-preferences.html)
- [Azure Advisor VM rightsizing criteria](https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations)
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
