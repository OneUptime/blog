# How to Revalidate Capacity After Code, Runtime, or Instance-Type Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Performance Testing, Reliability, Scalability, Load Testing

Description: Treat every performance-sensitive change as a new capacity calibration, compare repeatable before-and-after curves, and update production scaling safely.

---

A capacity number belongs to an artifact, workload, runtime, and infrastructure combination. A faster CPU can expose a lock, a runtime upgrade can change memory and garbage collection, and a harmless code change can add one downstream call per request.

Revalidation should answer whether the new system serves the forecast workload within its objectives and how its unit-capacity model changed.

## Define a capacity fingerprint

Attach the baseline to immutable or queryable inputs:

```yaml
application_commit: abc123
container_digest: sha256:example
runtime: example-runtime-version-and-flags
base_image: immutable-digest
instance_type: provider-type-generation-architecture
kernel_and_cgroup_mode: recorded
sidecars: [name-and-digest]
dependency_versions: recorded
dataset_snapshot: capacity-fixture-v7
traffic_mix: production-2026w35
test_definition: capacity-suite-v12
```

Also store safe useful throughput per instance, latency and error curves, CPU seconds per operation, memory distribution, GC, pool waits, storage and network demand, and the first saturation constraint. A headline RPS alone cannot explain a regression.

## Decide what triggers revalidation

Run the full capacity suite for changes likely to affect execution or placement:

- algorithms, serialization, compression, logging, retries, or fan-out;
- framework, compiler, interpreter, JIT, garbage collector, or allocator;
- base image, kernel, cryptography library, or container runtime;
- CPU architecture, generation, core count, memory, local disk, or network tier;
- sidecars, agents, service mesh, CNI, or storage driver;
- database schema, indexes, queries, or dependency versions;
- timeouts, pools, concurrency, resource requests, or limits.

Use a cheap smoke benchmark for ordinary changes, but do not let it replace full revalidation when the capacity fingerprint changes materially. Automate trigger classification and allow performance owners to escalate uncertain changes.

## Preserve comparability

Run old and new variants against the same production-shaped workload, data, dependency capacity, topology, and test generator. Prefer interleaved or randomized run order to reduce drift:

```text
old, new, new, old, old, new
```

Warm each variant identically. Repeat runs and report distributions or confidence intervals. Keep generator delivery checks; a lower achieved arrival rate can make the new variant look faster.

Control what can be controlled and record the rest: host placement, frequency behavior, noisy neighbors, region, network path, cache state, database state, and background maintenance. For a new instance type, sample multiple physical hosts.

## Compare curves, not one point

Run fixed-demand tests at ordinary and forecast peak plus a staircase through the SLO boundary. Compare:

```text
maximum SLO-safe useful throughput
latency histogram at equal offered load
CPU seconds per successful operation
memory p50, p99, peak, and post-recovery slope
GC or allocator pause and CPU time
database calls, connection hold time, and pool wait
network bytes, packets, and flows per operation
storage bytes and I/O per operation
queue growth, retry amplification, and recovery time
```

A new instance can produce 20 percent more maximum RPS yet use 30 percent more memory per request, reducing Pod density and erasing its cost advantage. Evaluate the complete deployment unit and failure domain.

At equal work, calculate ratios with uncertainty:

```text
throughput ratio = new SLO-safe throughput / old SLO-safe throughput
CPU-cost ratio   = new CPU seconds per op / old CPU seconds per op
memory ratio     = new peak-window memory / old peak-window memory
```

Define material regression thresholds before seeing results. Include correctness and error behavior; faster invalid responses are not a gain.

## Recalculate the capacity plan

When unit capacity changes, update:

- minimum, desired, and maximum replicas;
- HPA targets and custom-metric calibration;
- Pod requests, limits, and node packing;
- connection and worker-pool budgets;
- failure and maintenance reserves;
- quotas, commitments, and cost forecasts;
- overload and load-shedding thresholds.

Do not simply keep the old replica count after a regression. Confirm that quotas and provisioning lead time can satisfy the new maximum before rollout.

Google SRE guidance says to use load testing rather than tradition to reestablish resource-to-capacity ratios because a cluster that handled a given load months ago may no longer do so after system changes.

## Roll out with production evidence

Use a canary or small cohort with the new fingerprint. Send a representative share of each important request class and compare against a concurrent control. Watch normalized per-operation costs as well as user objectives.

Gate expansion on:

```yaml
correctness: pass
latency_slo: pass
error_rate: no-material-regression
safe_throughput_ratio: within-approved-bound
cpu_per_operation: within-approved-bound
memory_and_leak_checks: pass
dependency_amplification: within-approved-bound
rollback_capacity: verified
```

Retain old capacity during the rollback window. A mixed fleet may have different safe throughput per instance; load balancing by equal request count can overload the slower cohort. Use weighted routing or conservative shared limits until migration completes.

## Close the calibration loop

After representative production cycles, compare observed latency, work mix, per-operation resources, and scaling behavior with the test. Record forecast error and any environment gap. Promote the new capacity fingerprint only when production evidence is consistent.

Keep prior results for trend analysis. A gradual 2 percent CPU-cost regression across ten releases is a major capacity change even when every individual release passes a 5 percent threshold.

Schedule periodic revalidation even without an obvious trigger. Data size, customer mix, cache behavior, and external services evolve independently of application commits.

## Conclusion

Revalidate capacity whenever code, runtime, or infrastructure can change work per operation or the first bottleneck. Compare repeatable old and new capacity curves, recalculate every downstream scaling assumption, and roll out with a concurrent production control. Version the resulting capacity fingerprint so current plans never rely on an unexplained historical RPS number.

## Official Documentation

- [Google SRE Book: Production Services Best Practices](https://sre.google/sre-book/service-best-practices/)
- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)
- [Google SRE Book: Software Engineering in SRE](https://sre.google/sre-book/software-engineering-in-sre/)
- [Grafana k6 test lifecycle](https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/)
- [Grafana k6 scenarios](https://grafana.com/docs/k6/latest/using-k6/scenarios/)
- [Azure Well-Architected Framework: Capacity planning](https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/capacity-planning)
