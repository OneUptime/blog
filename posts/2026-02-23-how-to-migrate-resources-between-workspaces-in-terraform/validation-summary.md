# Validation Summary: How to Migrate Resources Between Workspaces in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform state management
- Terraform import
- Terraform moved blocks
- AWS provider resources
- Bash scripting

## Sources Consulted
- Terraform `state rm` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- Terraform `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform import overview: https://developer.hashicorp.com/terraform/cli/import
- Terraform `state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform workspace select command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform workspace new command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- Terraform workspaces state documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform moved block reference: https://developer.hashicorp.com/terraform/language/moved
- Terraform module refactoring documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record

## Issues Found
- The post did not state that `terraform import` requires matching destination resource configuration to already exist. Added a prerequisite sentence because Terraform CLI import adds an object to state and does not generate configuration.
- The migration script used `IFS=' -> ' read -r resource id`, which treats each character in the string as a delimiter and parses IDs incorrectly. Replaced it with explicit parsing around the ` -> ` separator.
- The validation script swallowed non-diff `terraform plan -detailed-exitcode` failures. Updated it to warn on exit code 2 and exit on other non-zero errors.
- The security group section said inline rules may also be tracked as separate resources. Corrected this to distinguish inline rules from separately managed rule resources and to warn against mixing them for the same security group.
- The moved-block section implied moved blocks could be used as a safer alternative for cross-workspace migration. Clarified that moved blocks are for address changes within a workspace and do not move state between workspaces.

## Review Notes
The main remove-and-import workflow is technically valid, but it remains operationally risky for large states because some provider resources have non-obvious import ID formats or are not importable. Future improvements could mention Terraform `import` blocks and `removed` blocks for plan/apply-based workflows, but the existing article remains correct after the targeted fixes.
