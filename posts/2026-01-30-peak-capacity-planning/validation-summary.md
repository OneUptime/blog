# Validation Summary: How to Build Peak Capacity Planning

## Status
validated

## Post Type
Guide / Tutorial (SRE / capacity planning practices)

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler (autoscaling/v2 API)
- k6 load testing CLI
- Prometheus / cAdvisor for node metrics
- OpenTelemetry traces (APM)
- Redis / Memcached caching
- CDN / edge caching
- AWS EC2 Spot / On-Demand instances (eksctl-style node group configuration)
- Mermaid diagrams (for illustrative flow charts)
- Python (priority-based rate limiting illustration)

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaler v2 docs: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- HPA configurable scaling behavior: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior
- k6 CLI reference: https://k6.io/docs/using-k6/k6-options/reference/
- k6 options (`--vus`, `--duration`, `-e/--env`): https://k6.io/docs/using-k6/k6-options/
- eksctl node group schema (`capacityType`, `spotAllocationStrategy`): https://eksctl.io/usage/schema/
- AWS EC2 Auto Scaling spot allocation strategies (capacity-optimized): https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html

## Issues Found
No technical issues found.

Verification details:
- Baseline RPS: 86,400,000 / (30 * 24 * 3600) = 33.33 RPS — matches stated 33.3.
- Peak multiplier: 166.5 / 33.3 = 5.0x — correct.
- Forecasted peak: 166.5 * 1.30 * 1.2 = 259.74 — matches stated 259.7.
- Target capacity: 259.7 * 1.25 = 324.625 — matches stated 324.6.
- Annual cost arithmetic: $1,000 * 350/365 * 12 = $11,506.85 (stated $11,507); $5,000 * 15/365 * 12 = $2,465.75 (stated $2,466); total $13,972.60 (stated $13,973). Savings vs. always-peak ($60,000): 76.7% (stated 77%).
- Normal hours (350 * 24 = 8,400) and peak hours (15 * 24 = 360) are correct.
- HPA YAML uses the stable `autoscaling/v2` API (GA since Kubernetes 1.23, Dec 2021), with valid fields: `scaleTargetRef`, `minReplicas`, `maxReplicas`, `metrics[].type: Resource`, `target.type: Utilization`, `averageUtilization`, and `behavior.scaleUp` with `stabilizationWindowSeconds` and a `Percent`-type policy. All fields verified against current Kubernetes docs.
- k6 CLI invocation: `--vus`, `--duration`, and `-e` are all current, valid flags.
- Python rate-limiting example is syntactically valid and logically consistent.
- Mermaid graph blocks use valid `graph LR` / `graph TD` syntax with subgraphs and node IDs.

## Review Notes
- The eksctl-style YAML in the Spot/Preemptible section uses lowercase `on-demand` and `spot` for `capacityType`. eksctl's managed node group schema typically expects uppercase (`ON_DEMAND` / `SPOT`), while Karpenter's `karpenter.sh/capacity-type` requirement uses lowercase. The snippet is clearly illustrative/conceptual (showing the mixed-instance idea) rather than a copy-paste-ready manifest for a specific tool, so it was not edited. A future revision could clarify which tool the YAML targets.
- Black Friday / Cyber Monday dates in the calendar table (Nov 29, Dec 2) are not year-tagged, so they read as generic examples rather than a hard claim. They happen to match 2024; for 2026, Black Friday falls on Nov 27 and Cyber Monday on Nov 30. Not an error in the post, but worth refreshing if the post is ever republished with a specific year.
- The post correctly cautions against assuming linear scaling, the importance of testing beyond forecasted peak, and the need to verify downstream dependencies — all sound SRE practice.
