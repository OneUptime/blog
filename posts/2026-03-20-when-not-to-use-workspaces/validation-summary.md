# Validation Summary: How to Understand When Not to Use Workspaces in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- OpenTofu (workspaces, CLI)
- Terraform / HCL
- AWS provider (EKS, EC2, ECS, S3)
- Infrastructure as Code

## Sources Consulted
- OpenTofu CLI documentation for workspaces: https://opentofu.org/docs/cli/commands/workspace/
- OpenTofu language reference for `terraform.workspace`: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu `state pull` command: https://opentofu.org/docs/cli/commands/state/pull/
- HashiCorp AWS provider — `aws_s3_bucket_public_access_block`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- HashiCorp AWS provider — `aws_eks_cluster`, `aws_instance`, `aws_ecs_service`
- OpenTofu provider `assume_role` block: https://opentofu.org/docs/language/settings/backends/s3/

## Issues Found
No technical issues found.

## Review Notes
- The `terraform.workspace` interpolation is retained in OpenTofu for Terraform compatibility and remains the correct reference — no `tofu.workspace` alias is required.
- All `tofu` CLI subcommands used (`workspace new`, `workspace select`, `state pull`, `plan`) match the current OpenTofu CLI surface.
- The AWS resource names and argument references (`block_public_acls` on `aws_s3_bucket_public_access_block`, `assume_role { role_arn = ... }` on the AWS provider) are accurate.
- The anti-patterns and rule-of-thumb guidance align with the official OpenTofu workspaces documentation, which explicitly notes that workspaces are not a substitute for separate configurations when environments differ structurally or require separate credentials/accounts.
