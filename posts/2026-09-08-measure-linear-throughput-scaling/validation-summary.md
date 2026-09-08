# Validation Summary: How to Measure Whether Adding Nodes Actually Produces Linear Throughput

## Status
validated

## Post Type
Technical guide to measuring horizontal scalability and SLO-compliant capacity. Includes mathematical formulas, numerical examples, an experimental procedure, and a YAML results record.

## Technologies Covered
- Horizontal scaling and capacity planning
- SLOs, useful throughput, latency, and error rates
- Load testing and Grafana k6
- Distributed databases, brokers, caches, and load balancing
- Linux Pressure Stall Information (PSI)
- YAML

## Sources Consulted
- Google SRE Book, Production Services Best Practices: https://sre.google/sre-book/service-best-practices/ — user-facing SLOs, load-tested capacity, and outage provisioning.
- Google SRE Book, The Production Environment at Google: https://sre.google/sre-book/production-environment/ — distributed infrastructure and shared services.
- Google SRE Book, Addressing Cascading Failures: https://sre.google/sre-book/addressing-cascading-failures/ — realistic capacity tests, cache effects, component bottlenecks, and failure testing.
- Google SRE Book, Load Balancing in the Datacenter: https://sre.google/sre-book/load-balancing-datacenter/ — traffic distribution and redistribution after backend failures.
- Grafana k6 test lifecycle: https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/ — setup, workload execution, and teardown.
- Grafana k6 open and closed models: https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/ — arrival-rate control and coordinated omission.
- Linux PSI documentation: https://www.kernel.org/doc/html/latest/accounting/psi.html — CPU, memory, and I/O pressure telemetry.
- HPC Wiki, Scaling: https://hpc-wiki.info/hpc/Scaling — scaling efficiency, serial-work limitations, and repeated representative measurements.
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/ — block mappings and scalar values.
- Author link: https://www.github.com/nawazdhandala — resolves to the intended GitHub profile.

## Issues Found
1. Dependency-capacity control was too restrictive. The instruction to keep dependencies fixed “only” for whole-system tests incorrectly excluded application-tier tests with fixed, sufficiently provisioned dependencies. Replaced it with guidance to record dependency changes as part of the topology, retaining the application-tier headroom requirement.
2. The fixed-demand example used 2,000 RPS despite a stated two-node SLO-safe capacity of 1,600 RPS. This would confound a comparison of coordination overhead with overload at the smallest topology. Changed the example to 1,200 RPS, below every compared topology's stated capacity. An intentional overload comparison would be valid but would need that qualification.
3. The failure-test instruction relied on the safe single-node limit. Per-node rates below that baseline do not establish SLO compliance when shared bottlenecks, cache state, and shard placement change. Replaced this with explicit SLO verification for the remaining topology while retaining traffic-balance checks.

## Review Notes
- Speedup and efficiency formulas are correct for the defined throughput comparison. Recomputed the table: speedups round to 1.00, 1.88, 3.29, and 4.94; efficiencies round to 100%, 94%, 82%, and 62%. The 2,600 RPS capacity shortfall and 350 RPS incremental yield are correct.
- The YAML is an illustrative results record, not a k6 or infrastructure configuration schema. Its field names are author-defined; the minimum efficiency of 0.62 is rounded. No executable code, CLI commands, or version-specific API calls require runtime testing.
- The numbers and database bottleneck are explicitly illustrative, not independently measured results. Documentation review cannot establish an actual deployment's capacity or diagnose its bottleneck.
- All five documentation links and the author link resolve to the intended resources. No deprecated APIs or outdated version-specific instructions were found.
- For future implementation, specify the latency percentile, error denominator, measurement window, soak duration, and uncertainty calculation. Excluding failures from useful throughput must not exclude them from the error-rate calculation.
- A fixed-demand generator should maintain the intended arrival rate and report dropped work; a closed-loop workload can reduce offered load as latency rises. The post does not provide a generator implementation to validate.
- The range record covers measured node counts 1, 2, 4, and 8; intermediate counts and larger deployments are not independently validated by these sample points. Operational headroom must be chosen separately from a measured maximum.
