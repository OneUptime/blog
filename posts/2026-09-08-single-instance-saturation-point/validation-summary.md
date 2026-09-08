# Validation Summary: How to Find the Saturation Point of a Single Service Instance Before Scaling Out

## Status
validated

## Post Type
Technical guide to single-instance capacity planning and load testing.

## Technologies Covered
- Open-arrival-rate load testing and Grafana k6
- Linux Pressure Stall Information (PSI)
- Service-level objectives, latency percentiles, and useful throughput
- CPU, memory, garbage collection, connection pools, disk, and downstream dependencies
- YAML for illustrative pass criteria

## Sources Consulted
- Google SRE Book: Addressing Cascading Failures — https://sre.google/sre-book/addressing-cascading-failures/
- Google SRE Book: Reliable Product Launches at Scale — https://sre.google/sre-book/reliable-product-launches/
- Google SRE Book: Monitoring Distributed Systems — https://sre.google/sre-book/monitoring-distributed-systems/
- Grafana k6 constant arrival rate executor — https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/
- Grafana k6 built-in metrics — https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- Linux Pressure Stall Information — https://www.kernel.org/doc/html/latest/accounting/psi.html
- YAML specification 1.2.2 — https://yaml.org/spec/1.2.2/
- Author profile link — https://github.com/nawazdhandala

## Issues Found
1. **Saturation and the SLO boundary were conflated.** An objective can fail before resource saturation. Separated these concepts in the definition while preserving the conservative capacity policy.
2. **The queue pass condition did not establish stability.** A non-monotonic queue can still grow over time, and a constant empty queue is healthy. Replaced it with `no-sustained-upward-trend` and clarified that the YAML is illustrative, not an executable tool configuration.
3. **The sample did not support its SLO-safe conclusion.** At 850 offered RPS and 848 useful RPS, the shortfall is approximately 0.235 percent, exceeding the 0.1-percent error limit if it represents failures; otherwise its cause needs explanation. The original 500 and 700 RPS rows had the same problem. Adjusted the illustrative useful rates to 499.8, 699.5, and 849.5 RPS, respectively, putting those shortfalls below 0.1 percent. Made the safe-stage conclusion conditional on all remaining pass criteria, since the table does not show p50, p95, timeout counts, or queue time series.
4. **The measurements were interpreted too strongly.** The highest observed throughput is not proof of a global maximum, and one queue depth per stage cannot establish temporal growth or an exact knee. Qualified both claims and retained the finer repeat-test recommendation.
5. **Moving a bottleneck was categorically dismissed as an improvement.** A worker-pool change can increase capacity even if the database becomes the next constraint. Corrected the criterion to an increase in sustainable SLO-safe throughput.

## Review Notes
- Official SRE guidance supports realistic component load tests, correctness checks, testing beyond capacity, recovery checks, and margins informed by workload and redundancy. The 15-minute duration, 5–10 percent increments, and 0.75 operating factor are example policies, not universal requirements.
- k6 arrival-rate executors schedule iterations independently of response completion, subject to available VUs. Their rate is iterations per time unit, not automatically HTTP requests per second; scripts must map iterations to the intended workload. Dropped iterations invalidate a claim that the full planned arrival rate was delivered, but remain useful diagnostic evidence.
- PSI describes resource stall time, not ordinary utilization. System-level CPU `full` is undefined and reported as zero for compatibility; availability and scope of telemetry should be checked on the deployed kernel.
- The YAML uses valid mapping and scalar syntax. Its duration and policy strings need interpretation by a test harness; no runnable program, shell command, or tool-specific configuration is supplied.
- Verified the arithmetic: 850 × 0.75 = 637.5, and rounding down yields 637 RPS. The example is illustrative, not an empirical benchmark of an identified service. No service load test was performed.
- All five documentation links resolved to the intended official resources. The author link resolved to the named GitHub profile. No version-pinned API or deprecated command appears in the post.
