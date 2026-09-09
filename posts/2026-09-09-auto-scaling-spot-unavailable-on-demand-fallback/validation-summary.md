# Validation Summary: Why EC2 Auto Scaling Does Not Fall Back from Spot to On-Demand

## Status
validated

## Post Type
Technical guide with AWS CLI commands and mixed instances policy configuration.

## Technologies Covered
- Amazon EC2 Auto Scaling and mixed instances policies
- EC2 Spot and On-Demand Instances
- Capacity Reservations and Distribution Segments
- AWS CLI, Bash, jq, JSON, and JMESPath

## Sources Consulted
- [AWS mixed group setup and retry behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html)
- [InstancesDistribution API](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html)
- [Distribution Segments](https://docs.aws.amazon.com/autoscaling/ec2/userguide/use-distribution-segments.html)
- [Mixed instances groups](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html)
- [Instance weighting](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-instance-weighting.html)
- [Auto Scaling Instance response schema](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_Instance.html)
- [CLI describe-auto-scaling-groups](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html)
- [CLI describe-scaling-activities](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-scaling-activities.html)
- [CLI update-auto-scaling-group](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html)
- [CLI EC2 describe-instances](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html)
- [Auto Scaling tags](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-tagging.html)
- [On-Demand Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-on-demand-instances.html)
- [On-Demand Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html)
- [jq manual](https://jqlang.org/manual/)
- [JMESPath specification](https://jmespath.org/specification.html)

## Issues Found
- The weighting caveat described exceeding targets as temporary. AWS documents that indivisible weighted instances can leave current capacity above desired capacity; this is not necessarily a transient replacement overlap. Changed the sentence to explain that the excess can persist while desired capacity remains unchanged.

## Review Notes
- Confirmed that Spot shortages trigger retries across eligible Spot pools rather than automatic conversion of the missing Spot allocation to On-Demand.
- Verified the example arithmetic: four base On-Demand instances plus 25% of sixteen additional instances gives eight On-Demand and twelve Spot instances. Raising MaxSize alone does not change the purchasing policy.
- Confirmed the configuration field names and price-capacity-optimized allocation strategy. Updating the base or percentage can gradually replace existing instances, launching replacements before terminating previous instances.
- Verified all four CLI command names, flags, response paths, instance-state and tag filters, and JMESPath projections against official references. Auto Scaling instance records expose lifecycle and health; EC2 records expose InstanceLifecycle, including the spot value.
- Confirmed that Distribution Segments support ordered reservation types and optional On-Demand fallback, with Spot excluded. The jq guard correctly excludes policies with a nonempty DistributionSegments list.
- Locally parsed every Bash block with bash -n and the JSON snippet with Python. Executed the jq guard against standard, null, and segment-based fixtures; verified that the percentage edit preserves all other policy fields.
- Reviewed the saved-policy rollback and operational guidance. Controller thresholds are explicitly workload-specific, and the post correctly distinguishes purchase lifecycle from application readiness.
- AWS documentation links resolve to the intended resources. The author link resolves to the named GitHub profile. No deprecated API use or explicit version mismatch was found.
- Validation used documentation and local syntax/fixture checks. No live AWS launches, scaling updates, or shortage experiments were performed. Execution requires AWS credentials, permissions, the intended account and Region, and an existing mixed instances group.
