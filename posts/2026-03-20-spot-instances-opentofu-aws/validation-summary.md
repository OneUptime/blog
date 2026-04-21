# Validation Summary: How to Use Spot Instances with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS EC2
- EC2 Spot Instances
- EC2 Auto Scaling groups
- AWS Launch Templates
- HCL
- Bash

## Sources Consulted
- AWS provider `aws_instance` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_launch_template` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown
- AWS provider `aws_autoscaling_group` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_group.html.markdown
- AWS provider `aws_ami` data source documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown
- AWS EC2 Auto Scaling launch template advanced settings: https://docs.aws.amazon.com/autoscaling/ec2/userguide/advanced-settings-for-your-launch-template.html
- AWS EC2 Spot Instance interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS EC2 Spot best practices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- AWS EC2 SpotMarketOptions API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_SpotMarketOptions.html
- OpenTofu CLI initialization documentation: https://opentofu.org/docs/cli/init/
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu strings and heredoc documentation: https://opentofu.org/docs/language/expressions/strings/

## Issues Found
- The examples referenced `data.aws_ami.amazon_linux.id` without defining that data source. I added an `aws_ami` data source for the latest Amazon Linux 2023 x86_64 AMI from the Amazon owner so the examples have a valid AMI lookup.
- The Spot Instance example set a fixed `max_price`. AWS documents that specifying a maximum Spot price is not recommended because it can increase interruptions; when omitted, the request pays the current Spot price. I removed the hard-coded max price.
- The launch template set `instance_market_options` to request Spot Instances, and the Auto Scaling example then reused that launch template in a mixed instances policy. AWS documents this as incompatible. I removed the Spot request from the launch template so the mixed instances policy controls the On-Demand/Spot distribution.
- The Auto Scaling group used `capacity-optimized`. This is still a valid provider value, but AWS currently recommends `price-capacity-optimized` for Spot allocation because it balances capacity availability and price. I updated the example and conclusion to use `price-capacity-optimized`.
- The interruption handler polled the older `spot/termination-time` metadata path without IMDSv2. AWS documents `termination-time` as maintained for backward compatibility and recommends `spot/instance-action`, retrieved with IMDSv2. I updated the script to fetch an IMDSv2 token and poll `spot/instance-action`.
- The section described the script as a termination handler even though the current Spot interruption metadata can indicate interruption actions beyond termination. I changed the wording to interruption handler.

## Review Notes
The examples still assume normal surrounding OpenTofu configuration such as an AWS provider configuration and values for `var.subnet_ids`. The local `tofu` binary is not installed in this environment, so validation was performed against official documentation rather than by executing `tofu validate`.
