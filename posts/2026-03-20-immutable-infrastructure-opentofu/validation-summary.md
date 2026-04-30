# Validation Summary: How to Use Immutable Infrastructure Patterns with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL (Terraform-compatible configuration)
- AWS provider for OpenTofu/Terraform
- Amazon EC2 Auto Scaling
- Amazon EC2 Launch Templates
- Amazon Machine Images (AMIs)
- Amazon VPC security groups
- AWS Systems Manager Session Manager
- Packer / EC2 Image Builder

## Sources Consulted
- OpenTofu resource behavior and lifecycle documentation: https://opentofu.org/docs/v1.11/language/resources/behavior/
- Terraform AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Amazon EC2 Auto Scaling instance refresh documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-instance-refresh.html
- Amazon EC2 Auto Scaling group update behavior: https://docs.aws.amazon.com/autoscaling/ec2/userguide/update-auto-scaling-group.html
- Amazon EC2 launch template version management: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-launch-template-versions.html
- AWS Systems Manager Session Manager documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- Amazon VPC security group rules documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html

## Issues Found
- The post attributed immutable instance replacement to OpenTofu `create_before_destroy`. I changed the section to use launch template versioning plus Auto Scaling Group `instance_refresh`, because `create_before_destroy` only changes replacement order when a resource must be replaced and is not the documented mechanism for rotating ASG instances.
- The Auto Scaling Group example used `version = "$Latest"`. I changed it to `aws_launch_template.app.latest_version` because the AWS provider docs explicitly note that provider-managed instance refreshes do not start when the ASG launch template version is set to `$Latest`.
- The Auto Scaling Group name included the AMI ID, which forced whole-group replacement instead of updating the existing group and refreshing instances. I changed the name to a stable value so AMI changes roll out through instance refresh rather than ASG recreation.
- The launch template example implied the launch template itself would be recreated on AMI changes. I removed the `create_before_destroy` lifecycle block and corrected the comments to reflect AWS launch template version behavior.
- The `aws_ami` data source used `data.aws_caller_identity.current.account_id` without defining that data source. I changed `owners` to `["self"]`, which is the documented shorthand and makes the snippet self-contained.
- The security group example was not attached to the launch template and had no ingress rules, which would block all inbound application traffic rather than only SSH. I attached the security group to the launch template and changed the example to allow application traffic while omitting SSH.
- The mermaid diagram said `Packer/Docker` for building an AMI. I changed it to `Packer/Image Builder` to avoid implying that Docker itself builds AMIs.
- The provider version pin used `~> 5.30`, which is outdated relative to the current AWS provider 6.x line. I updated the example to `~> 6.0`.

## Review Notes
- The post now reflects the current AWS provider major version as of April 30, 2026. The syntax used in the revised snippets matches the current provider documentation.
- `instance_refresh` behavior around availability depends on group size and warmup/healthy-percentage settings. Very small Auto Scaling Groups may need additional tuning such as `max_healthy_percentage`, checkpoints, or an instance maintenance policy.
- Disabling SSH reduces operational drift but does not by itself make infrastructure immutable. The immutability property comes from replacing instances with a new image instead of mutating running instances. The revised wording now reflects that distinction.
