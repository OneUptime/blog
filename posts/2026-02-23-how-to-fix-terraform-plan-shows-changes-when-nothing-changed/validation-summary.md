# Validation Summary: How to Fix Terraform Plan Shows Changes When Nothing Changed

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (CLI, HCL, lifecycle meta-argument, state)
- AWS provider for Terraform (`aws_instance`, `aws_security_group`, `aws_security_group_rule`, `aws_iam_role_policy`, `aws_iam_policy_document`)
- AWS resources (EC2 instances, EBS gp3 volumes, security groups, IAM policies, instance credit specification)

## Sources Consulted
- Terraform CLI documentation — `terraform refresh`, `apply -refresh-only`, `apply -replace`, `taint` (https://developer.hashicorp.com/terraform/cli/commands)
- Terraform language docs — `lifecycle` meta-argument and `ignore_changes` (https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- AWS provider registry — `aws_instance` `credit_specification` and `root_block_device` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance)
- AWS provider registry — `aws_security_group` and `aws_security_group_rule` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule)
- AWS provider registry — `aws_iam_policy_document` data source (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document)
- Terraform 0.15.4 release notes for deprecation of `terraform refresh` standalone command

## Issues Found
- **Pattern 6 used the deprecated `terraform refresh` command.** As of Terraform 0.15.4, the standalone `terraform refresh` subcommand is deprecated in favor of `terraform apply -refresh-only` (or `terraform plan -refresh-only`). Updated the code block to use `terraform apply -refresh-only` and added a one-line note that the legacy command still exists but is deprecated. The post already correctly used `-refresh-only` later in the "Refresh State to Eliminate Drift" section, so the fix makes the post internally consistent as well.

## Review Notes
- The post's mention of `terraform taint` already correctly hedges with "Or in newer Terraform" pointing to `terraform apply -replace=...`, which is accurate (`taint` was deprecated in Terraform 0.15.2). No change needed there.
- The `ignore_changes = [tags["LastModifiedBy"]]` syntax (per-key map indexing) requires Terraform 0.13 or later. This is fine for any reasonably current Terraform version and worth noting only as a minor version caveat.
- The AWS provider now also offers `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` (added in provider v4.45.0, late 2022) as a newer alternative to `aws_security_group_rule`. The post's recommendation to use `aws_security_group_rule` is still valid and works, but readers on newer provider versions may prefer the newer dedicated rule resources, which have stronger ID stability.
- All HCL snippets, plan-output examples, and CLI commands (other than the fixed `terraform refresh`) match current Terraform/AWS-provider behavior.
