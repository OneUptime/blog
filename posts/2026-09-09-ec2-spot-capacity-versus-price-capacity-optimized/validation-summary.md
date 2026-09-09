# Validation Summary: How to Choose Capacity or Price-Capacity Optimized EC2 Spot Allocation

## Status
validated

## Post Type
Technical guide with AWS CLI commands and a jq configuration transformation.

## Technologies Covered
- Amazon EC2 Spot Instances and Spot capacity pools
- Amazon EC2 Auto Scaling mixed instances policies
- EC2 Fleet and Spot Fleet allocation strategies
- AWS CLI, Bash, jq, and JSON
- Instance weighting, checkpointing, interruption recovery, and workload cost measurement

## Sources Consulted
- Auto Scaling allocation strategies: https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html
- InstancesDistribution API: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html
- EC2 Fleet allocation strategies: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html
- EC2 Fleet SpotOptionsRequest API: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_SpotOptionsRequest.html
- Spot Fleet CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html
- Auto Scaling update CLI reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html
- Auto Scaling describe CLI reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html
- AWS CLI file parameters: https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-file.html
- AWS CLI environment variables: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- Spot Instance interruptions: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-interruptions.html
- jq manual: https://jqlang.org/manual/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. AWS guidance supports starting with price-capacity optimization and evaluating capacity optimization for similar instance prices or unusually expensive interruptions.
- Verified the instance-type/Availability-Zone pool definition, capacity-based selection, API-specific enum spellings, and the absence of a capacity reservation or guaranteed instance lifetime.
- Confirmed that RequestSpotFleet is a legacy API discouraged for new use; the post accurately presents it as a maintenance concern rather than recommending it for new deployments.
- Checked both Auto Scaling command names, group-name flags, query paths, JSON output, AWS_REGION, and file:// input against AWS documentation. The exported mixed instances policy has the input structure expected by the update operation.
- Both Bash blocks passed bash -n. Executed the exact jq transformation against representative local policies, including one without InstancesDistribution. Verified that only SpotAllocationStrategy and SpotInstancePools changed, while launch templates, overrides, weights, purchase percentages, and an existing maximum price were preserved. The jq guard accepted a mixed policy and rejected null and missing-launch-template fixtures.
- Confirmed that SpotInstancePools is valid only for lowest-price and that allocation-strategy updates govern future launches without replacing existing instances. Purchase-distribution changes can cause gradual replacement.
- Retaining an existing price cap is consistent with isolating the experiment. AWS generally discourages maximum-price caps because they can reduce launch availability and increase interruptions; the post appropriately calls for a separate review.
- Verified the example arithmetic: 80 / 1,000 = 0.08 and 72 / 800 = 0.09. The comparison is illustrative, assumes at least one successfully completed job, and does not claim current AWS prices or guaranteed savings.
- Flexibility across compatible types and zones, instance weighting, durable checkpoints, and interruption recovery are consistent with AWS guidance. Repeated workload measurements and accounting for capacity conditions are reasonable experimental recommendations, not guarantees about either strategy.
- All links in the post resolved to the intended documentation or author profile. No software version is pinned. The GNU Bash web manual could not be retrieved; Bash syntax was checked with the local parser.
- No live AWS API update, capacity launch, or billing experiment was performed. Runtime authorization, account-specific configuration, available capacity, and actual workload economics remain environment-dependent.
