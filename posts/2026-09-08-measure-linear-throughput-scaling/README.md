# How to Measure Whether Adding Nodes Actually Produces Linear Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Scalability, Performance Testing, Load Testing, Reliability

Description: Compare useful SLO-compliant throughput at increasing node counts, quantify scaling efficiency, and expose shared bottlenecks and load imbalance.

---

Doubling nodes does not guarantee double the service capacity. Shared databases, locks, coordination, load-balancer skew, cache behavior, and cross-node traffic can make each additional node contribute less than the previous one.

Measure scale-out as an experiment. The output should be a capacity curve with uncertainty, not a claim that the architecture is horizontally scalable.

## Define useful throughput

Use a business operation that crosses the intended system boundary, such as orders committed per second or objects durably ingested per second. Exclude failed, timed-out, duplicate, and semantically invalid results.

For each node count `n`, find the highest throughput `X_n` that still meets the same latency and error objectives. Then calculate efficiency against the one-node baseline:

```text
speedup S_n    = X_n / X_1
efficiency E_n = X_n / (n * X_1)
```

Perfect linear scaling has `E_n = 1`. An efficiency above 1 can occur because a larger aggregate cache improves the workload or because the one-node test was not representative. Investigate it instead of assuming superlinear scaling will continue.

## Keep the comparison controlled

Use identical nodes, application builds, resource limits, runtime flags, data sets, and request mixes. Keep dependency capacity fixed only when testing the whole system boundary. If the goal is application-tier scalability, ensure the database, message broker, load generator, and network have enough headroom.

For every node count:

1. deploy the topology and wait for readiness;
2. warm code and data caches using the same procedure;
3. run a staircase load test to the SLO boundary;
4. hold the candidate maximum for a soak period;
5. repeat enough times to report run-to-run variation;
6. return the environment to the same starting state.

Alternate test order or include a second one-node control at the end. Otherwise data growth, cache warming, or dependency degradation over time can look like a node-count effect.

## Calculate the scaling curve

Suppose testing produces:

```text
nodes   SLO-safe RPS   speedup   efficiency
1       850            1.00      100%
2       1,600          1.88       94%
4       2,800          3.29       82%
8       4,200          4.94       62%
```

The eight-node deployment is faster, but not close to linear. Planning at `8 * 850 = 6,800 RPS` would overstate tested capacity by 2,600 RPS.

Also calculate incremental yield:

```text
incremental throughput per added node = (X_b - X_a) / (b - a)
```

Moving from four to eight nodes adds only 350 RPS per new node, compared with the 850 RPS single-node baseline. This makes diminishing returns visible to both engineering and cost owners.

## Measure distribution and shared work

At each stage inspect per-node request rate, useful throughput, latency, CPU pressure, memory, connections, and cache-hit ratio. A cluster average can hide one hot shard or load-balancer imbalance. Report the coefficient of variation or at least minimum and maximum per-node load.

Track shared components at the same time:

- database transaction and lock wait time;
- connection-pool occupancy and acquisition wait;
- broker partitions and consumer lag;
- storage latency and IOPS;
- network bandwidth and retransmissions;
- coordination, leader, or metadata-service CPU;
- load-generator delivery and dropped work.

A fixed serial fraction creates diminishing speedup. Do not fit an ideal linear line through early low-load points. Determine the actual SLO-safe boundary at every topology.

## Separate two useful experiments

A fixed-demand test asks whether adding nodes improves latency and resilience at the same production load. A scaled-demand test asks whether additional nodes increase maximum useful throughput. Run both:

```text
fixed demand: 2,000 RPS at 2, 4, and 8 nodes
scaled demand: find maximum SLO-safe RPS at each node count
```

The first exposes coordination overhead and per-request efficiency. The second creates the capacity curve. If latency worsens at fixed demand as nodes are added, cross-node work or cache dilution may dominate.

## Test failure and placement

Even scaling under ideal placement is insufficient. Repeat a representative point with one node unavailable and during a rolling update. Verify that remaining nodes receive balanced traffic and stay below their safe single-node limit.

If nodes span failure zones, inspect cross-zone dependencies and quotas. Eight nominal nodes do not provide eight useful units if a partition, shard, or affinity rule prevents work from reaching them.

Record the fitted range rather than promising one constant factor forever:

```yaml
validated_range: 1-to-8-nodes
workload_mix: production-2026w35
safe_capacity_rps:
  1: 850
  2: 1600
  4: 2800
  8: 4200
minimum_efficiency: 0.62
first_shared_constraint: primary-database-cpu
```

Revalidate beyond eight nodes and after changes to code, sharding, instance type, runtime, or dependency topology.

## Conclusion

Measure horizontal scaling with useful throughput at a consistent SLO, then report speedup, efficiency, incremental yield, and variance. Per-node telemetry identifies imbalance while shared-component telemetry explains diminishing returns. Plan from the measured curve, including failure cases, rather than multiplying a one-node benchmark indefinitely.

## Official Documentation

- [Google SRE Book: Production Services Best Practices](https://sre.google/sre-book/service-best-practices/)
- [Google SRE Book: The Production Environment at Google](https://sre.google/sre-book/production-environment/)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Grafana k6 test lifecycle](https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/)
- [Linux Pressure Stall Information](https://www.kernel.org/doc/html/latest/accounting/psi.html)
