# Validation Summary: How to Set an On-Demand Baseline in Mixed EC2 Auto Scaling Groups

## Status
validated

## Post Type
Technical guide with AWS CLI commands and a mixed instances policy configuration.

## Technologies Covered
- Amazon EC2 Auto Scaling mixed instances groups
- EC2 On-Demand and Spot Instances
- AWS CLI, JSON configuration, and JMESPath queries
- Launch templates, Availability Zones, and VPC subnets
- Instance weighting and capacity-based scaling metrics

## Sources Consulted
- [Mixed group setup and scaling behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html)
- [InstancesDistribution API parameters](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html)
- [Instance weighting](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-instance-weighting.html)
- [Create Auto Scaling group CLI](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html)
- [Describe Auto Scaling groups CLI](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html)
- [Describe EC2 instances CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html)
- [AWS CLI command-line options and region selection](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-options.html)
- [EC2 general purpose instance specifications](https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html)
- [Auto Scaling instance tagging](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-tagging.html)
- [Target tracking scaling policies and metric requirements](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html)

## Issues Found
- Both verification commands omitted the region although the creation command explicitly selected `us-east-1`. A different configured default could return no matching resources or inspect a different group; an unset region could cause a CLI error. Added `--region us-east-1` to both describe commands to keep the workflow consistent. AWS documents that command-line region selection overrides configuration and environment settings.

## Review Notes
- Confirmed that the base is fulfilled before applying the percentage to additional capacity, and that it does not independently increase desired capacity. Recalculated all five distribution table rows, including the six On-Demand/six Spot result at desired capacity twelve.
- Confirmed rounding toward On-Demand for fractional instance counts and whole-instance overshoot with weights. Group sizes and the base must share capacity units; manual weighting requires weights for all overrides. Attribute-based selection supports `units`, `vcpu`, and `memory-mib` through `DesiredCapacityType`.
- Checked the policy structure, fixed launch-template version syntax, allocation strategy values, and creation command against the current CLI/API documentation. Parsed the JSON successfully and checked all three shell examples with `bash -n`.
- Checked both JMESPath projections against documented response structures. Auto Scaling exposes lifecycle state and weight, while EC2 exposes purchase lifecycle. The automatic group-name tag and pending/running filter are valid. Purchase lifecycle can have values other than Spot, so the advice to inspect other purchase types is appropriate.
- All four example instance types have two vCPUs and 8 GiB memory with x86 processors. Equal resource sizes do not guarantee equal application throughput; workload testing remains necessary as the post explains.
- Confirmed that changing the base or percentage triggers gradual replacement, with new instances launched before previous instances terminate. Multi-zone resilience, recovery headroom, and capacity-normalized queue metrics are sound application-dependent guidance.
- The four official documentation links resolve to the intended resources. No deprecated fields or commands were identified. Launch-template version `5` is a user-specific placeholder, not an AWS software version.
- Validation was documentation-based and local syntax/arithmetic checking. No AWS resources were created, and no live fulfillment, quota, connectivity, or application recovery tests were performed. The example requires valid account-specific launch-template and subnet values; service throughput must be measured in the reader's environment.
