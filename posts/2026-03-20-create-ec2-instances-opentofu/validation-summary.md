# Validation Summary: How to Create EC2 Instances with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS EC2 (`aws_instance`)
- AWS AMI data source (`data.aws_ami`)
- AWS Security Groups (`aws_security_group`)
- AWS IAM (`aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_iam_instance_profile`)
- AWS Launch Templates (`aws_launch_template`)
- AWS Auto Scaling Groups (`aws_autoscaling_group`)
- AWS EBS (root_block_device, ebs_block_device)
- AWS Systems Manager (SSM) managed policy

## Sources Consulted
- Terraform AWS Provider — `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider — `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS Provider — `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider — `aws_iam_role`, `aws_iam_instance_profile`, `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider — `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS Provider — `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS managed policy ARN reference: `arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore`
- Canonical AWS account ID for Ubuntu AMIs: `099720109477`
- OpenTofu documentation: https://opentofu.org/docs/

## Issues Found
1. **Incorrect `user_data` usage in `aws_instance`** — The "Full Production-Ready EC2 Instance" example used `user_data = base64encode(templatefile(...))`. This is incorrect because the `aws_instance` resource's `user_data` attribute takes a plain (UTF-8) string and Terraform base64-encodes it internally. Wrapping the value in `base64encode()` causes double-encoding, which would produce a corrupted cloud-init script at the instance. The correct attribute for already-base64-encoded data is `user_data_base64`. Changed `user_data = base64encode(templatefile(...))` to `user_data_base64 = base64encode(templatefile(...))`. Note: this differs from `aws_launch_template.user_data`, which *does* expect base64-encoded input — that example in the post is correct and was left unchanged.

## Review Notes
- The Canonical owner ID (`099720109477`) and AMI name filter pattern for Ubuntu 22.04 (`ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*`) are correct.
- The IAM trust policy uses the correct `ec2.amazonaws.com` service principal and `sts:AssumeRole` action.
- The SSM managed policy ARN (`arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore`) is the correct ARN for the SSM agent's required permissions.
- The launch template's `iam_instance_profile` is correctly defined as a block (not a string attribute, which is how it works on `aws_instance`).
- The `$Latest` version reference for launch templates is the correct sentinel string (literal dollar-sign), not interpolation syntax.
- The post uses inline `ingress`/`egress` blocks within `aws_security_group`. AWS provider 5.x introduced standalone `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` resources as a preferred approach for many use cases (better rule-level lifecycle management), but the inline approach is still fully supported and not deprecated. No change required, but readers may want to consider the standalone resources for new designs.
- `disable_api_termination` is a valid argument and behaves as described.
- The `lifecycle { ignore_changes = [ami] }` pattern is a reasonable way to prevent instance replacement on AMI updates, but readers should be aware this can drift from intended state if the AMI must change for security reasons — consider replacing instances deliberately when AMIs change.
