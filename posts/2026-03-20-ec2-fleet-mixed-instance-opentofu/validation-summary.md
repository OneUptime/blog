# Validation Summary: How to Create EC2 Fleet with Mixed Instance Types in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2 Fleet
- AWS EC2 Launch Templates
- Amazon CloudWatch
- AWS Systems Manager Agent

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/init/
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform AWS provider docs for `aws_ec2_fleet`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_fleet.html.markdown
- Terraform AWS provider implementation/tests for `aws_ec2_fleet`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/ec2/ec2_fleet.go and https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/ec2/ec2_fleet_test.go
- Terraform AWS provider docs for `aws_launch_template`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- Terraform AWS provider docs for `aws_cloudwatch_metric_alarm`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS EC2 Fleet overview and fleet selection guidance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Fleets.html and https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/which-fleet-method-to-use.html
- AWS EC2 Fleet prerequisites: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-prerequisites.html
- AWS EC2 Fleet allocation strategies: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html
- AWS EC2 Fleet CloudWatch metrics: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-cloudwatch-metrics.html
- AWS EC2 API reference for target capacity: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_TargetCapacitySpecification.html
- AWS Systems Manager documentation for SSM Agent on Amazon Linux: https://docs.aws.amazon.com/systems-manager/latest/userguide/ami-preinstalled-agent.html

## Issues Found
- The introduction implied EC2 Fleet uniquely enabled mixed On-Demand and Spot capacity and framed Spot Fleet as its direct evolution. I changed this to say EC2 Fleet supports mixed capacity in one request and that AWS recommends it over Spot Fleet because Spot Fleet is now a legacy API with no planned investment.
- The prerequisites omitted the `AWSServiceRoleForEC2Fleet` service-linked role, which AWS documents as required for `request` and `maintain` fleets. I added it.
- The `on_demand_options.allocation_strategy` value used the AWS CLI spelling `lowest-price`, but the OpenTofu/Terraform AWS provider expects `lowestPrice`. I corrected the value.
- The example used `on_demand_options.min_target_capacity` on a `maintain` fleet. Provider documentation says this setting is supported only for `instant` fleets, so I removed it.
- The target capacity block explicitly set `spot_target_capacity` alongside `total_target_capacity` and `on_demand_target_capacity`. AWS EC2 Fleet documentation shows the default target capacity type fills the remaining capacity, so I removed the explicit Spot target and clarified that the remaining 8 units are Spot.
- The launch template user data enabled the SSM Agent but did not start it. I added `systemctl start amazon-ssm-agent` so the example actually starts the service during boot.
- The CloudWatch alarm referenced a non-existent `AWS/EC2Fleet` namespace, an invalid `TargetCapacityFulfillment` metric, and the wrong `FleetId` dimension. I replaced it with a metric math alarm that divides `FulfilledCapacity` by `TargetCapacity` using the documented `AWS/EC2Spot` namespace and `FleetRequestId` dimension.
- The conclusion described `price-capacity-optimized` imprecisely and made a hard rule about using at least 4-5 instance types. I reworded it to match AWS guidance: the strategy prefers high-capacity pools and then lowest-priced pools among them, and diversification across multiple instance types and Availability Zones improves capacity availability.

## Review Notes
- AWS currently recommends Amazon EC2 Auto Scaling over EC2 Fleet when you want managed instance lifecycle features. The post remains technically valid for direct EC2 Fleet usage.
- The `tofu` CLI was not installed in the local review environment on 2026-05-01, so CLI command verification relied on the official OpenTofu documentation rather than local `tofu --help` output.
