# Validation Summary: How to Use Spot Placement Scores Before Scaling a Batch Workload

## Status
validated

## Post Type
Technical guide with AWS CLI commands and an Auto Scaling configuration excerpt.

## Technologies Covered
- Amazon EC2 Spot placement scores
- AWS CLI and IAM permissions
- EC2 Regions, Availability Zones, and subnets
- EC2 C6i and C6a instances
- Amazon EC2 Auto Scaling mixed instances policies and instance weighting
- Bash, JSON, jq, and JMESPath

## Sources Consulted
- Spot placement score overview and limits: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-placement-score.html
- How placement scores work: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-sps-works.html
- Required scoring permissions: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sps-iam-permission.html
- Get Spot placement scores CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/get-spot-placement-scores.html
- Describe Availability Zones CLI reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-availability-zones.html
- Regions and Zones: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html
- Availability Zone IDs: https://docs.aws.amazon.com/global-infrastructure/latest/regions/az-ids.html
- C6i instance specifications: https://aws.amazon.com/ec2/instance-types/c6i/
- C6a instance specifications: https://aws.amazon.com/ec2/instance-types/c6a/
- Auto Scaling instance weighting: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-instance-weighting.html
- Auto Scaling launch template structure: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_LaunchTemplate.html
- Auto Scaling launch template overrides: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_LaunchTemplateOverrides.html
- Auto Scaling allocation strategies: https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html
- jq manual: https://jqlang.org/manual/
- JMESPath specification: https://jmespath.org/specification.html

## Issues Found
- The introduction to `describe-availability-zones` implied that the command also maps subnets. Its output contains zone metadata, not subnet records. Removed “and subnets”; the following instruction to provision into a subnet in the selected zone remains applicable.
- The JSON excerpt was described generically as belonging to an Auto Scaling policy. Specified its exact location, `MixedInstancesPolicy.LaunchTemplate`, to distinguish it from a scaling policy and identify the correct nesting for `Overrides`. The JSON fields and weights required no changes.

## Review Notes
- Confirmed the score range, absence of capacity or interruption guarantees, minimum instance-type diversity, usage-based target limits, configuration limits, and time-sensitive nature of scores. Different named sizes count as different types.
- Confirmed both scoring commands use supported flags and response fields. The endpoint Region and candidate Region filter serve different purposes; target capacity defaults to instances when the unit is omitted.
- Confirmed scoring assumes matching workload requirements, the capacity-optimized strategy, and the corresponding regional or single-zone placement. The distinction from price-capacity-optimized is accurate.
- Both families use x86 processors. The xlarge instances provide 4 vCPUs and the 2xlarge instances provide 8, matching the string-valued weights. Desired capacity of 160 therefore represents 160 weighted vCPU units. Minimum and maximum group sizes must also use weighted units; Auto Scaling can overshoot desired capacity when accommodating instance weights.
- Zone IDs consistently identify physical zones across accounts. Zone names can differ for older accounts in certain Regions, so the post's qualified statement remains correct.
- Parsed all three Bash blocks with `bash -n`, parsed the JSON excerpt, checked its weights, and executed the jq sorting expression on synthetic scores. Reviewed JMESPath projections against the documented response schemas and language specification.
- No live AWS calls or instance launches were performed. Account permissions, quotas, images, subnets, data access, current capacity, and actual fulfillment remain deployment-specific prerequisites. The zone lookup separately requires permission for `ec2:DescribeAvailabilityZones`; jq must be installed for the sorting command.
- All four official documentation links in the post resolved to the intended resources. No deprecated API or option was identified. Operational guidance about deadlines, data readiness, and measuring worker registration is appropriate planning advice, not a claim that placement scores validate those conditions.
