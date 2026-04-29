# Validation Summary: How to Use EC2 Launch Templates with OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2 Launch Templates
- Amazon EC2 Auto Scaling
- Amazon EBS
- IAM instance profiles
- EC2 instance metadata service (IMDSv2)

## Sources Consulted
- OpenTofu `templatefile` function: https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu `base64encode` function: https://opentofu.org/docs/language/functions/base64encode/
- AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS provider implementation for `aws_launch_template`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/ec2/ec2_launch_template.go
- Amazon EC2 Auto Scaling launch templates guide: https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-templates.html
- Create a launch template for an Auto Scaling group: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html
- LaunchTemplateSpecification API reference: https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_LaunchTemplateSpecification.html
- LaunchTemplateBlockDeviceMappingRequest API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_LaunchTemplateBlockDeviceMappingRequest.html
- LaunchTemplateTagSpecificationRequest API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_LaunchTemplateTagSpecificationRequest.html

## Issues Found
- The `no_device = ""` launch template example was removed. AWS documents `NoDevice` as an empty string, but the current AWS provider implementation only serializes a non-empty `no_device` string for `aws_launch_template`, so the published snippet would not reliably produce the documented API behavior.
- The network interface note was corrected. `vpc_security_group_ids` does not conflict with `network_interfaces` in general; the documented conflict is specifically with `network_interfaces.security_groups`.
- The CPU credit example was tightened by changing `instance_type` to `t3.micro` in that snippet. `cpu_credits = "unlimited"` is for burstable T-family instances, so the previous generic `var.instance_type` example could be invalid as written.
- The hibernation comment was corrected to match the code. The snippet had `configured = false`, so it was disabling hibernation, not enabling it.
- The versioning section was corrected. `lifecycle { create_before_destroy = true }` does not create launch template versions or provide Auto Scaling instance refresh behavior. It was replaced with `update_default_version = true`, and the explanation was updated to reflect actual launch template version semantics.

## Review Notes
- The `tag_specifications` example using `resource_type = "network-interface"` is valid per the EC2 API, even though some provider docs summarize supported launch-template tag targets more narrowly.
- The Amazon Linux 2023 AMI data source filter is syntactically valid, but it intentionally selects the most recent matching `al2023-ami-*-x86_64` image. If a future revision needs a specific AL2023 variant, it should add tighter filters.
