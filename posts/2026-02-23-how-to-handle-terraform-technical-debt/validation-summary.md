# Validation Summary: How to Handle Terraform Technical Debt

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Terraform configuration language
- Terraform provider version constraints
- Terraform state management
- HashiCorp AWS provider
- AWS ECS services
- AWS EC2 AMI data sources
- Bash scripting

## Sources Consulted
- Terraform version constraints: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform provider requirements: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform CLI `version` command: https://developer.hashicorp.com/terraform/cli/commands/version
- Terraform state commands: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform CLI overview and global options: https://developer.hashicorp.com/terraform/cli/commands
- Terraform dynamic blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform input variables: https://developer.hashicorp.com/terraform/language/values/variables
- AWS provider `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_ecs_service` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service

## Issues Found
- The `required_version = ">= 0.14"` comment described the configured Terraform version itself as very old. That constraint actually allows Terraform 0.14 and newer, including current versions. Updated the comment to say it allows very old Terraform versions.
- The automated debt detection script's `VARS_WITHOUT_DESC` grep pipeline did not reliably identify variables missing descriptions; it mostly counted variable declaration lines. Replaced it with an `awk` check that tracks each `variable` block and counts blocks without a `description =` argument.

## Review Notes
- Terraform CLI was not installed in the local workspace, so command behavior was verified against official HashiCorp CLI documentation rather than local `--help` output.
- The scorecard thresholds, such as "within 2 minor versions" and state size limits, are opinionated operational guidance rather than Terraform requirements.
