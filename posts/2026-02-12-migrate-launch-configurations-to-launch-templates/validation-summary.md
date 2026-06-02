# Validation Summary: How to Migrate from Launch Configurations to Launch Templates

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- AWS EC2 Auto Scaling
- AWS Launch Configurations
- AWS Launch Templates
- AWS CLI
- Terraform AWS Provider
- EC2 user data

## Sources Consulted
- AWS EC2 Auto Scaling launch configuration limitations: https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html
- AWS EC2 Auto Scaling migration guide for launch configurations to launch templates: https://docs.aws.amazon.com/autoscaling/ec2/userguide/migrate-to-launch-templates.html
- AWS CLI `update-auto-scaling-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html
- AWS CLI launch template examples for Auto Scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/examples-launch-templates-aws-cli.html
- AWS CLI `create-launch-template` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template.html
- AWS EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Terraform AWS Provider `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS Provider `aws_launch_configuration` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/launch_configuration

## Issues Found
- The audit section said the Launch Configuration listing command showed associated Auto Scaling groups, but the command only lists Launch Configuration attributes. Updated the sentence to describe the actual output.
- The ASG query was described as showing Launch Configuration versus Launch Template usage, but it only filters ASGs that still have `LaunchConfigurationName`. Updated the wording to match the query.
- The post implied AWS provides a direct CLI conversion from Launch Configuration to Launch Template. AWS documents the direct copy feature as a console workflow, while CLI migration requires recreating the launch template data. Updated the wording.
- The Launch Template benefits section implied `$Latest` applies changes broadly and automatically. Updated it to clarify that `$Latest` or `$Default` affects new launches.
- The mixed instance type and Spot/On-Demand bullets were imprecise because those are Auto Scaling mixed instances policy capabilities that use launch templates. Updated both bullets to mention mixed instances policies.
- The Terraform launch template example copied Launch Configuration user data directly. Terraform `aws_launch_template.user_data` expects base64-encoded user data, so the example now base64-encodes the Launch Configuration data and preserves `null` when no user data exists.
- The security group edge-case guidance was incorrect and unclear. Updated it to distinguish top-level `SecurityGroupIds` from network interface `Groups`.

## Review Notes
The migration process described is technically valid after the corrections. The CLI launch template example remains illustrative rather than a full automated conversion from `lc-details.json`; a future improvement could show a generated JSON mapping for all Launch Configuration fields, including block devices, metadata options, EBS optimization, and Spot settings.
