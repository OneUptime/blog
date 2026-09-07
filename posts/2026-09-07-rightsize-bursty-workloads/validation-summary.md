# Validation Summary: Rightsizing Bursty Workloads Without Losing Spike Capacity

## Status
validated

## Post Type
Technical guide covering capacity planning and operational implementation. Although it has no executable code or commands, its autoscaling, queue sizing, CPU-credit, and cost-calculation details warrant technical review.

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA), node autoscaling, and Pod readiness
- Amazon EC2 T-family burstable instances and CPU credits
- Amazon EC2 Auto Scaling and scheduled scaling
- Queue-based worker scaling, including Amazon SQS guidance
- EC2 network capacity and Amazon EBS storage performance
- Load testing, canary evaluation, and workload cost measurement

## Sources Consulted
- [EC2 burstable performance concepts](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html): baseline performance, Standard and Unlimited modes, and startup credits.
- [EC2 burstable instances and best practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html): workload suitability and memory requirements.
- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/): periodic evaluation, custom metrics, readiness handling, stabilization, and scaling policies.
- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/): provisioning for unschedulable Pods and interaction with workload scaling.
- [Scaling policy based on Amazon SQS](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html): backlog per instance, processing time, and acceptable latency.
- [Scheduled scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html): predictable capacity changes and scheduling lead time.
- [EC2 instance network bandwidth](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html): instance-dependent bandwidth and network constraints.
- [Amazon EBS volume types](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html): differences in throughput, IOPS, and burst behavior.
- [EC2 instance types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html): resource and hardware differences between instance families.
- [AWS Cost Optimization Pillar](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/cost-optimization.html) and [monitoring cost and usage](https://docs.aws.amazon.com/wellarchitected/latest/framework/cost-03.html): measuring workload cost efficiency.
- [AWS resiliency guidance](https://aws.amazon.com/blogs/compute/building-well-architected-serverless-applications-building-in-resiliency-part-1/): retries can increase load on an overloaded dependency.
- [Google SRE monitoring](https://sre.google/workbook/monitoring/): metric granularity and service monitoring.
- [Google SRE canarying releases](https://sre.google/workbook/canarying-releases/): comparing canary and control signals and limitations of synthetic testing.
- [Author profile](https://github.com/nawazdhandala): verified the author link destination.

## Issues Found
1. **Cost formula mixed units and omitted normalization.** The formula added “extra replicas” to monetary costs and produced a total despite introducing it as cost per completed unit. Changed this to extra replica cost, explicitly divided total cost by completed units, and specified a common measurement interval and counting each cost once. This makes the equation dimensionally consistent and avoids double-counting retry compute already included in instance costs.
2. **The scaling-delay example did not distinguish endpoint rate from queue storage.** The additional 600 requests per second is correct, but does not establish how much work a queue must hold. Added the accumulated backlog of 54,000 requests under explicit linear-ramp, baseline-capacity, and empty-queue assumptions, plus the requirement to drain it before deadlines. Verified the arithmetic independently: 200 × 3 = 600 requests/second; 0.5 × 180 × 600 = 54,000 requests.

## Review Notes
- All four official documentation links point to the intended resources. The burstable-instance overview includes the best-practices section referenced by the link label.
- Standard-mode throttling and possible Unlimited-mode surplus charges are correctly described. Startup and recurrence matter because credit availability and repayment depend on instance family and lifetime.
- Queue depth and concurrency can reveal demand earlier than CPU for some workloads; they are workload-dependent signals, not universally predictive metrics. HPA custom or external metrics require the appropriate metrics integration.
- A pending Pod can trigger node provisioning when it is unschedulable and a suitable node autoscaler is configured. There is no universal provisioning duration; the three-minute interval is an illustrative assumption.
- Network, storage, memory, connection, file-descriptor, licensing, and architecture checks are candidate-specific. The post does not assert universal numerical limits. EBS burst credits apply only to volume types that use them.
- The CPU percentages and replay matrix are illustrative evaluation guidance, not universal performance guarantees. No production replay or canary was run as part of this documentation review.
- There are no executable samples, CLI commands, configuration schemas, or pinned software versions requiring runtime or deprecation tests. The text blocks are a measurement checklist and a cost equation.
