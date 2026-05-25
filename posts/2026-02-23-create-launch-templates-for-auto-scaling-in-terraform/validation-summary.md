# Validation Summary: How to Create Launch Templates for Auto Scaling in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS EC2 Launch Templates
- Amazon EC2 Auto Scaling Groups
- Amazon Linux 2023 AMIs
- EC2 user data
- EC2 Spot Instances
- IMDSv2
- EBS volumes and encryption

## Sources Consulted
- Terraform AWS Provider `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS Provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Amazon EC2 Auto Scaling launch templates documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-templates.html
- Amazon EC2 Auto Scaling launch configurations documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html
- Amazon EC2 Auto Scaling launch template creation documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html
- Amazon EC2 user data documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- Amazon Linux 2023 EC2 launch documentation: https://docs.aws.amazon.com/linux/al2023/ug/ec2.html
- Amazon EC2 Auto Scaling Spot launch template documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-template-spot-instances.html

## Issues Found
- The versioning example used `version = "$Latest"` and stated that combining `$Latest` with `instance_refresh` would roll existing instances when the launch template changes. Terraform AWS Provider documentation notes that an instance refresh will not start when `version = "$Latest"` is configured; the ASG launch template version should use `aws_launch_template.<name>.latest_version` so Terraform observes the ASG change and starts the refresh. Updated the example, explanation, and summary accordingly.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The HCL snippets were reviewed against the current official Terraform AWS Provider documentation.
- The examples intentionally reference resources and variables defined outside the snippets, such as security groups, IAM instance profiles, KMS keys, and subnet variables.
- The mixed instances example can use `$Latest` for new launches, but teams that also want Terraform-triggered instance refreshes should use the launch template resource's `latest_version` attribute in the ASG configuration.
