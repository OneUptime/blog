# Validation Summary: How to Create AMIs from EC2 Instances with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS EC2
- AWS AMIs (Amazon Machine Images)
- AWS provider (Terraform/OpenTofu)
- AWS SSM Parameter Store
- AWS KMS (for AMI copy encryption)
- HCL (HashiCorp Configuration Language)
- Bash / cloud-init user_data

## Sources Consulted
- AWS provider docs: `aws_ami_from_instance` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ami_from_instance)
- AWS provider docs: `aws_ami_copy` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ami_copy)
- AWS provider docs: `aws_ami_launch_permission` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ami_launch_permission)
- AWS provider docs: `aws_ssm_parameter` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter)
- AWS provider docs: `aws_instance` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance)
- AWS docs: Create an Amazon EBS-backed AMI (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami-ebs.html)
- Terraform/OpenTofu `formatdate` function reference

## Issues Found
- **Inappropriate `cfn-signal` call in user_data (Step 1).** The bootstrap script invoked `/opt/aws/bin/cfn-signal -e $? --stack golden-image-build`. `cfn-signal` is a CloudFormation helper script meant to notify a CloudFormation `WaitCondition` or `CreationPolicy`; it has no role in an OpenTofu/Terraform workflow because there is no CloudFormation stack named `golden-image-build` to signal to. The command was also missing the required `--resource` argument and a `--region`, so it would not have worked even in a CloudFormation context. Replaced it with a benign completion marker (`touch /var/lib/golden-image-ready`) that is consistent with the rest of the script and won't fail at runtime.

## Review Notes
- The comment on `aws_ami_from_instance` ("AWS will stop the instance briefly, snapshot all volumes, then restart") is informally accurate — AWS performs a clean shutdown/reboot of the instance before snapshotting unless `snapshot_without_reboot = true`. Per AWS docs, this is described as "Amazon EC2 powers down the instance before creating the AMI"; the post's wording captures the user-visible behavior correctly.
- `aws_ami_from_instance`, `aws_ami_copy`, `aws_ami_launch_permission`, and `aws_ssm_parameter` argument names and types all match the current AWS provider schema.
- `formatdate("YYYYMMDD", timestamp())` and `formatdate("YYYY-MM-DD", timestamp())` are valid Terraform/OpenTofu format directives.
- Using `timestamp()` in resource names will cause OpenTofu to compute a new value on each plan, which can produce noisy diffs and prevent in-place updates. This is a common, well-known tradeoff for date-stamped AMI names and is acceptable for the golden-image pattern shown, but readers should be aware.
- AMI names must be unique within a region. If the workflow runs more than once on the same UTC day, the `formatdate("YYYYMMDD", ...)` name will collide. Adding a more granular timestamp suffix (or a build/commit identifier) would be more robust, but the current code is not technically incorrect for a once-a-day build.
- `aws_ami_launch_permission` requires exactly one of `account_id`, `group`, `organization_arn`, or `organizational_unit_arn` — the post correctly uses `account_id`. For organization-wide sharing, `organization_arn` would scale better than enumerating accounts, but enumerating accounts is also valid.
- The user_data hardening (`ClientAliveInterval`/`ClientAliveCountMax` appended via `echo >>`) will produce duplicated entries if the instance ever reruns user_data; using `sed` to replace existing directives would be more robust, but functionally the appended values take effect because OpenSSH uses the last occurrence.
- `nginx` and `amazon-cloudwatch-agent` packages: on Amazon Linux 2 these may need `amazon-linux-extras` (e.g., `amazon-linux-extras enable nginx1`); on Amazon Linux 2023 they are available directly via `dnf`/`yum`. The post does not pin a specific Amazon Linux generation in the snippet, so this is a soft caveat rather than an error.
