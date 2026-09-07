# Validation Summary: P95, P99, or Maximum for Safe Rightsizing

## Status
validated

## Post Type
Technical guide with capacity calculations and Kubernetes implementation guidance.

## Technologies Covered
- AWS Compute Optimizer, Amazon EC2, and EBS
- Azure Advisor VM rightsizing
- Kubernetes CPU requests, resource limits, OOM handling, and Horizontal Pod Autoscaler (HPA)
- CPU and memory telemetry, percentiles, capacity planning, and autoscaling

## Sources Consulted
- AWS Compute Optimizer rightsizing preferences: https://docs.aws.amazon.com/compute-optimizer/latest/ug/rightsizing-preferences.html
- AWS Compute Optimizer EC2 recommendations and utilization graphs: https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html
- Azure Advisor resize criteria: https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations
- Kubernetes resource requests and limits: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes resource metrics pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/

## Issues Found
1. **Observed usage was equated with demand without qualification.** Clarified that the multiplication recovers observed usage, uses fractional utilization and the metric's actual capacity denominator, and can understate demand under saturation or throttling. This prevents applying instance-normalized formulas directly to request-normalized container metrics.
2. **Maximums were presented as exposing hard bounds.** Revised the table and conclusion to describe observed peaks. Sampling cannot establish an absolute future bound or capture events absent from the recorded data.
3. **Post-GC memory was offered as an alternative sizing metric without accounting for intervening peaks.** Required inspection of total container memory peaks and clarified that post-GC measurements alone miss allocations between collections. Retained the existing considerations for native allocations, caches, leaks, and failover.
4. **The monitoring checklist called for error percentiles.** Replaced this with latency percentiles and error rates over matching time windows, which makes the intended service-outcome comparison precise.
5. **The 3-core request example omitted node contention.** Clarified that using CPU above the request depends on available node CPU and must be validated under realistic contention. Removing a tight limit does not reserve burst capacity.

## Review Notes
- Confirmed AWS CPU threshold choices P90, P95, and P99.5, with P99.5 as the default and headroom configured separately. These CPU/memory preferences apply to EC2 instances.
- Confirmed Azure's resize criteria use P95 CPU/outbound network and P99 memory. Target ceilings differ by workload classification. The page was retrieved directly after the browser fetch timed out.
- Confirmed the arithmetic: 8 × 0.35 = 2.8 vCPU; 2.8 / 0.70 = 4 vCPU; 30 × 24 × 60 × 0.01 = 432 one-minute samples (7.2 hours in aggregate). A percentile does not reveal whether exceedances are contiguous; finite-sample quantile conventions and ties can affect exact exceedance counts.
- Confirmed CPU throttling and reactive memory OOM behavior, HPA utilization relative to requests, and support for raw average-value or custom metrics.
- AWS's documented five-minute maximum aggregation reinforces the need to distinguish sampled peaks from instantaneous demand. Kubernetes CPU metrics also average usage over a measurement window; a short scrape interval alone does not undo upstream averaging.
- The percentile choices and 3-core request are conditional engineering examples, not universal guarantees. Actual safety requires the replay, recovery, contention, and canary checks described in the post.
- Text blocks are illustrative formulas and event data, not executable commands or deployment configuration. No language APIs, CLI flags, or version-pinned configuration require execution testing.
- All four documentation links identify the intended official resources. The author link is a plausible GitHub profile URL, not a technical source.
