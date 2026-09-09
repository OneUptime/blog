# Validation Summary: How to Diversify Spot Fleet Without Unnecessary Overprovisioning

## Status
validated

## Post Type
Technical guide with AWS CLI commands and a Spot Fleet JSON configuration.

## Technologies Covered
- Amazon EC2 Spot Instances and Spot Fleet
- EC2 Fleet and EC2 Auto Scaling deployment alternatives
- Weighted capacity and Spot allocation strategies
- EC2 launch templates, IAM roles, VPC subnets, and Availability Zones
- C6i and C6a instance families
- Capacity Rebalancing
- AWS CLI, Bash, JSON, and JMESPath

## Sources Consulted
- [Spot Fleet request CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html)
- [LaunchTemplateOverrides API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_LaunchTemplateOverrides.html)
- [Fleet instance weighting](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-instance-weighting.html)
- [Fleet allocation strategies](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html)
- [Fleet Capacity Rebalancing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-capacity-rebalance.html)
- [Describe instance type offerings CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-type-offerings.html)
- [Describe Spot Fleet requests CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-spot-fleet-requests.html)
- [Describe Spot Fleet instances CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-spot-fleet-instances.html)
- [C6i specifications](https://aws.amazon.com/ec2/instance-types/c6i/)
- [C6a specifications](https://aws.amazon.com/ec2/instance-types/c6a/)
- [Spot Fleet permissions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-fleet-prerequisites.html)
- [EC2 instance types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html)
- [VPC subnets](https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html)

## Issues Found
- **Inspection commands relied on the default Region.** The request explicitly creates the fleet in `us-east-1`, but both subsequent describe commands omitted `--region`. With another default Region, the commands would query the wrong endpoint; without a configured Region they could fail. Added `--region us-east-1` to both commands to match fleet creation. No other README changes were needed.

## Review Notes
- Confirmed the JSON structure, launch template overrides, numeric weights, `maintain` request type, `terminate` interruption behavior, and Spot Fleet spelling `priceCapacityOptimized` against AWS references.
- Confirmed two vCPUs for both `large` types and four for both `xlarge` types. These are EBS-only types; the post correctly requires separate compatibility checks for workloads needing local storage. Capacity weights are workload accounting, and equal vCPU counts do not guarantee equal throughput.
- Checked the 40-unit examples and the impossibility of exactly fulfilling 41 units with even weights. Four instance types across two distinct Availability Zones provide eight theoretical pools; offerings do not guarantee available Spot capacity.
- Confirmed the distinction between eligible pools and actual placement, and the explanation of replacement overlap with the `launch` rebalancing strategy. Rebalance-marked instances are excluded from AWS fulfillment accounting, so total running capacity can differ from the reported fulfilled capacity. Active-instance listings are periodically refreshed and may be stale.
- AWS still documents RequestSpotFleet but discourages its use as a legacy API with no planned investment. The post explicitly scopes it to existing fleets and correctly warns that EC2 Fleet uses a different request format.
- All linked AWS reference pages resolved to the intended resources. The author URL redirected to the matching GitHub profile.
- Parsed the embedded JSON and checked every Bash block with `bash -n`. Reviewed CLI flags and JMESPath response field names against the command references. No live AWS requests were submitted and no billable capacity was launched. Placeholder resource validity, account permissions, quotas, subnet connectivity, current Spot capacity, and application throughput require environment-specific verification.
