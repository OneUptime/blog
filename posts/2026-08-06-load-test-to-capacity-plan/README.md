# Turn Load-Test Results into a Capacity Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Load Testing, Capacity Planning, Autoscaling, Kubernetes, Performance Engineering, Site Reliability Engineering, Operational Readiness

Description: Convert measured safe throughput into demand, headroom, failover, saturation, autoscaling, quota, and growth decisions.

---

A load test produces observations. A capacity plan turns those observations into a production promise: this workload can serve a defined demand mix within its SLO, retain stated failure capacity, and scale before queues or resources cross safe limits.

The conversion is not "maximum requests per second times replica count." Capacity can be nonlinear, traffic mixes change cost, autoscaling takes time, dependencies have independent limits, and a test that ends at the first error says little about recovery.

AWS recommends production-like user journeys, sanitized data, predefined performance thresholds, and whole-architecture observation. Google SRE recommends testing overload behavior and keeping user-facing services away from key bottlenecks. The formulas below are planning tools; their inputs and margins are organizational decisions.

## Define Demand in Work Units

Requests per second is useful only when requests have similar cost. Build a workload model by user journey or operation:

| Operation | Peak rate | Relative cost | Payload | Fan-out | SLO |
| --- | ---: | ---: | ---: | ---: | --- |
| Product read | 6,000/s | 1.0 | 4 KiB | 2 cache calls | 99% under 300 ms |
| Search | 1,200/s | 4.5 | variable | 3 search shards | 99% under 800 ms |
| Checkout | 180/s | 8.0 | 12 KiB | payment and inventory | 99.9% available |

Relative cost can be CPU time, database work, bytes, concurrency, or a calibrated composite. Preserve the individual operation rates as well as a weighted aggregate because different resources can become bottlenecks.

Include:

- average, seasonal peak, launch spike, and growth horizon;
- geographic and tenant skew;
- cache hit and miss mix;
- read, write, and expensive-query mix;
- retries and dependency fan-out;
- batch, maintenance, and deployment traffic;
- failover redistribution;
- expected abusive but valid traffic.

Forecast assumptions need an owner and timestamp. Capacity does not remain valid when product behavior changes.

## Run More Than One Test Shape

Use several controlled tests:

- **baseline**: validate instrumentation and normal behavior;
- **step**: increase load in stable increments to expose the first bottleneck;
- **stress**: cross the safe limit to observe rejection and failure behavior;
- **spike**: test an abrupt increase faster than autoscaling can react;
- **soak**: hold expected peak long enough to expose leaks, compaction, and thermal effects;
- **failure under load**: remove a replica, zone, dependency, or control path within a safe boundary;
- **recovery**: reduce demand or restore capacity and measure backlog drain and stability.

Use the production artifact, realistic topology, and sanitized or synthetic data with representative size and distribution. If test and production differ, record the expected effect rather than applying an unexplained multiplier.

Monitor user SLIs and every plausible saturation boundary: CPU throttling, memory and garbage collection, threads, connection pools, file descriptors, disk IOPS and latency, network, lock contention, queue age, database limits, downstream rate limits, and control-plane quotas.

## Find Safe Capacity, Not Breaking Capacity

Define a **safe capacity point** as the highest sustained demand at which:

- relevant SLOs remain satisfied;
- no queue or in-flight work grows without bound;
- no hard quota or resource limit is approached beyond policy;
- dependencies remain within their agreed limits;
- the system can reject excess work predictably;
- recovery occurs without manual repair.

Do not use the highest momentary throughput. Throughput can appear to rise while latency, timeouts, or queue age make the work useless.

Record the first limiting resource and how it fails. If CPU is 55 percent when a database connection pool saturates, CPU-based autoscaling will not protect the service. If test clients saturate first, the test has not found service capacity.

Repeat enough trials to understand variation. Report a range and test conditions, not a false-precision single number.

## Derive Effective Capacity

Suppose the measured safe throughput per capacity unit is `C_test`. Apply only evidence-backed derating factors:

```text
C_effective = C_test * environment_factor * workload_mix_factor
```

Each factor is at most 1.0. For example, a production encryption path or heavier payload distribution might justify a measured derating. Avoid a generic 20 percent reduction with no evidence.

This per-unit formula is valid only if tests show near-linear scaling over the planned range. Shared databases, locks, partitions, network links, and quotas often make fleet capacity nonlinear. When scaling is nonlinear, use a tested fleet capacity curve.

Define design demand as the largest applicable scenario:

```text
D_design = max(forecast_peak, launch_spike, failover_demand)
```

Then calculate demand headroom. If policy requires 30 percent free demand headroom:

```text
C_usable >= D_design / (1 - 0.30)
```

For 7,000 work units per second, that requires 10,000 units per second of usable capacity. Multiplying demand by 1.3 gives only 23.1 percent free capacity, not 30 percent.

With a proven effective capacity of 800 units per second per replica:

```text
N_serving = ceil(10,000 / 800) = 13 replicas
```

If the service must retain that capacity after losing one replica, provision at least 14. For a zone loss, calculate the capacity in surviving zones and account for traffic redistribution, not just the fleet-wide count.

## Separate Redundancy from Growth Headroom

Headroom serves different risks:

- **demand headroom** absorbs forecast error and bursts;
- **failure reserve** replaces capacity lost with a replica, node, zone, or region;
- **deployment reserve** covers temporarily unavailable instances during rollout;
- **scaling reserve** carries traffic while new capacity becomes ready;
- **dependency reserve** keeps downstream systems away from their limit.

Do not label one spare replica as all five. Model scenarios that can overlap, such as a deployment during peak traffic or a zone failure while autoscaling is quota constrained.

## Model Autoscaling as a Delayed Control Loop

Autoscaling does not create instant capacity. Measure:

- metric collection and publication delay;
- controller evaluation interval;
- decision and provisioning latency;
- image pull, startup, migration, and cache-warm time;
- readiness delay;
- traffic-balancer convergence;
- scale-down stabilization;
- quota and node-capacity availability.

Upstream Kubernetes implements the HorizontalPodAutoscaler as a periodic control loop and documents a default 15-second controller interval, although cluster operators can configure it. The HPA ratio uses observed versus desired metrics. CPU utilization requires relevant resource requests, and missing or not-yet-ready Pod metrics alter scaling calculations conservatively. Verify actual managed-cluster settings and metric pipelines.

Choose a scaling signal that leads the bottleneck. CPU can work for CPU-bound homogeneous requests. Queue age, concurrency, or request rate may be better for I/O-heavy or asynchronous work. Configure maximum replicas, scaling velocity, and stabilization from test evidence.

Pre-provision enough capacity when demand can rise faster than the complete scale-up delay. A maximum replica setting is not available capacity unless quotas, nodes, dependencies, and startup time support it.

## Plan Queue and Backlog Recovery

For asynchronous systems, capacity must meet both steady arrivals and recovery objectives. When processing rate is `P`, arrival rate is `A`, and backlog is `B`:

```text
net_drain_rate = P - A
drain_time = B / net_drain_rate
```

The drain time is finite only when `P > A`. Use message age and business deadline as well as count. Retries, poison messages, ordering constraints, and downstream limits can reduce the observed drain rate.

Test backlog recovery at representative age and size. A consumer that catches up by overwhelming its database has not demonstrated safe capacity.

## Turn Saturation into Signals and Actions

For each limiting resource, define:

| Signal | Safe range | Scale point | Shed or throttle point | Hard limit | Owner action |
| --- | --- | --- | --- | --- | --- |
| Example queue age | under 30 s | 30 s | 90 s | 5 min business expiry | add consumers, then limit intake |

The values must come from the service's SLO and test curve. Alert on user impact or on a limit early enough for a necessary human action. Use cause metrics for diagnosis.

Define overload behavior before the cliff: admission control, per-tenant quotas, bounded queues, request priority, load shedding, and degraded results. Google warns that uncontrolled retries and slow failed work can amplify overload into cascading failure.

## Publish the Capacity Plan

The final artifact should include:

- artifact, environment, topology, and dataset tested;
- workload mix and test shapes;
- safe capacity curve and first bottleneck;
- SLI results at each step;
- effective-capacity assumptions;
- forecast, spike, failure, deployment, and growth scenarios;
- minimum, target, and maximum capacity;
- autoscaling signal and measured end-to-end delay;
- quotas and downstream limits;
- overload and recovery behavior;
- re-test triggers and plan owner.

Re-test after meaningful code, runtime, instance, data distribution, dependency, or scaling-policy changes. Compare each release with a stable baseline in the delivery pipeline where practical.

## Capacity Readiness Checklist

- [ ] The test mix represents critical production journeys and payloads.
- [ ] Safe capacity is defined by SLO and stable queues, not peak throughput.
- [ ] The first bottleneck and its failure behavior are known.
- [ ] Headroom, redundancy, rollout, and scaling reserve are separate.
- [ ] Linear scaling is used only where tests support it.
- [ ] Autoscaling delay is measured from signal to ready capacity.
- [ ] Maximum scale is backed by quota, nodes, and dependency capacity.
- [ ] Failure-under-load and recovery tests succeeded.
- [ ] Queue drain meets age and completion objectives.
- [ ] Assumptions have owners and re-test triggers.

## Official Documentation

- [AWS Well-Architected: Load Test Your Workload](https://docs.aws.amazon.com/wellarchitected/latest/framework/perf_process_culture_load_test.html)
- [Google SRE Workbook: Managing Load](https://sre.google/workbook/managing-load/)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes: Resource Metrics Pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)

## Conclusion

A capacity plan starts where the load test ends. Define representative demand, find the SLO-safe limit, identify the bottleneck, calculate true free headroom, reserve for failures and rollouts, and measure autoscaling as a delayed system. Then prove overload and recovery behavior. Capacity is ready when the assumptions, limits, and actions are visible enough to survive the next spike and the next failure.
