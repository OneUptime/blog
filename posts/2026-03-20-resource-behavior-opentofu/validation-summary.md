# Validation Summary: How to Understand Resource Behavior in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for OpenTofu/Terraform
- AWS EC2 `aws_instance`

## Sources Consulted
- OpenTofu Resource Behavior: https://opentofu.org/docs/language/resources/behavior/
- OpenTofu Resource Blocks syntax: https://opentofu.org/docs/language/resources/syntax/
- OpenTofu `tofu plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command: https://opentofu.org/docs/cli/commands/apply/
- HashiCorp AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_instance` source schema: https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/ec2/ec2_instance.go

## Issues Found
- The create, update, replace, and destroy plan summaries did not consistently match OpenTofu's documented `Plan: X to add, Y to change, Z to destroy.` format. Updated the examples to use the full format with terminal periods.
- The replacement examples used invalid illustrative AMI strings (`ami-0newami456` and `ami-0new`). Replaced them with AMI ID strings that match AWS AMI ID format.
- The resource dependency example declared an `aws_instance` without `instance_type`, which is required unless a launch template supplies it. Added `instance_type = "t3.micro"`.
- The computed attribute output comment said the value must be referenced after apply. OpenTofu allows the reference in configuration while the value remains unknown until apply, so the comment was changed to say the value is known after apply.

## Review Notes
- The local `tofu` binary was not installed, so CLI flag verification was performed against the official OpenTofu command documentation.
- The AWS provider supports in-place `instance_type` changes by stop/start for compatible instance types; the shown `t3.micro` to `t3.small` example is consistent with that behavior.
