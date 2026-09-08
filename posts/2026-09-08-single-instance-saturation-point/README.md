# How to Find the Saturation Point of a Single Service Instance Before Scaling Out

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Load Testing, Performance, Scalability, Site Reliability Engineering

Description: Measure the throughput and latency knee of one production-shaped instance, identify its first limiting resource, and establish a defensible safe capacity.

---

Autoscaling cannot compensate for an unknown unit of capacity. Before choosing replica counts or scaling thresholds, determine how much production-shaped work one instance can safely serve and how it fails beyond that point.

The saturation point is not simply 100 percent CPU or the largest completed RPS. It is the load where an additional unit of offered work no longer produces a proportional useful result. A service objective can be violated before that point, setting a lower capacity limit.

## Isolate one representative unit

Test the same artifact, runtime flags, CPU architecture, memory limit, sidecars, kernel settings, and dependency path used in production. Keep one service instance under test while providing dependencies enough capacity that they do not become accidental bottlenecks. If a shared dependency is intentionally part of the boundary, say so and measure it.

Warm the application before recording results. Populate realistic caches, complete JIT compilation, establish pools, and let autosized runtime components settle. Use production-like data volume and cardinality. A tiny database or a 100 percent cache hit rate can inflate the apparent instance capacity.

## Define success before applying load

Choose an SLO-shaped pass condition, for example (illustrative YAML, not a load-generator configuration):

```yaml
latency:
  p50: 80ms
  p95: 180ms
  p99: 350ms
errors: less-than-or-equal-to 0.1-percent
timeouts: 0
queue_growth: no-sustained-upward-trend
minimum_stage_duration: 15m
```

Also define correctness checks. A server returning fast `503` responses has high completed HTTP throughput but no useful capacity. Count successful business operations separately from total responses.

## Run a staircase test

Use an open-arrival-rate generator so slower responses do not reduce the offered rate. Start well below expected capacity, hold until latency, queues, pools, CPU, and memory stabilize, and then increase in small steps. Near the knee, use increments of roughly 5 to 10 percent rather than jumping directly from healthy to collapse.

At every stage record:

- offered, accepted, successful, and completed operations per second;
- latency histograms by request class;
- in-flight requests and queue depth;
- CPU use, throttling, and pressure stall information;
- memory working set, allocation rate, garbage collection, faults, and OOM events;
- connection-pool waiters and downstream latency;
- disk and network throughput, retransmits, and I/O pressure.

Reject a test stage if the generator drops scheduled iterations. Grafana k6 documents `dropped_iterations` as work the generator could not start, which means the target did not actually receive the intended arrival rate.

## Locate the knee, not just the cliff

Plot useful throughput and latency against offered throughput. A typical sequence looks like this:

```text
offered RPS   useful RPS   p99 latency   queue
500           499.8        110 ms        0
700           699.5        135 ms        1
850           849.5        210 ms        4
925           912          390 ms        38
1000          918          1.4 s         410
```

The highest observed successful throughput is about 918 RPS, but that is not its safe capacity. If the p99 objective is 350 ms and the other pass conditions also hold, the highest safe measured stage is 850 RPS. The sharp increase in queue depth at 925 RPS suggests the saturation knee; queue measurements over time are needed to confirm whether each stage is stable.

Confirm it with a finer test around 850 to 925 RPS and repeat the run. Capacity is a distribution, so record variation across hosts and deployments rather than publishing one precise number from one test.

## Identify the first constrained resource

High utilization alone is not proof of a bottleneck. Look for resource pressure that coincides with latency and queue growth:

- CPU: rising runnable delay or CPU PSI, throttling time, and flat useful throughput;
- memory: increasing reclaim or memory PSI, GC time, paging, or OOM kills;
- pool: waiters and acquisition latency while the pool is at its limit;
- disk: I/O PSI or queue latency before nominal bandwidth is reached;
- downstream: rising dependency latency, errors, or quota rejection.

Linux Pressure Stall Information quantifies time lost because tasks are waiting on CPU, memory, or I/O. It is often more useful than an average utilization percentage at the knee.

Change one suspected constraint and rerun. Doubling a worker pool that shifts saturation to the database is a capacity improvement only if it increases the sustainable SLO-safe rate.

## Establish a safe unit of capacity

Take the lower of the SLO boundary and the onset of nonlinearity, then reserve explicit operational margin:

```text
tested SLO-safe rate = 850 RPS
operating factor     = 0.75
published safe rate  = floor(850 * 0.75) = 637 RPS per instance
```

The example rounds down so the published integer does not overstate the calculated rate. The factor is a policy informed by run-to-run variance, burstiness, noisy neighbors, failover, and scaling lead time. It is not universal. State whether the rate applies to an average production mix, a particular heavy class, or both.

Run a soak at the proposed safe rate and a controlled overload stage above the knee. Confirm bounded queues, load shedding, retry behavior, recovery, and no lasting memory or pool damage. Google SRE guidance recommends testing both capacity limits and the overload failure mode.

## Conclusion

Find single-instance capacity with a production-shaped staircase test, explicit service objectives, and useful-throughput accounting. The correct operating point is below the first latency or throughput knee, validated by a soak and overload recovery test. Publish the environment and workload assumptions with the number so scaling decisions remain reproducible.

## Official Documentation

- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)
- [Grafana k6 constant arrival rate executor](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/)
- [Grafana k6 built-in metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/reference/)
- [Linux Pressure Stall Information](https://www.kernel.org/doc/html/latest/accounting/psi.html)
