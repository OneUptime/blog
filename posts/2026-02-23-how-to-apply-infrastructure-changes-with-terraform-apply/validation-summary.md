# Validation Summary: How to Apply Infrastructure Changes with terraform apply

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform apply and plan workflows
- Terraform state and state locking
- Terraform input variables and variable files
- Terraform resource targeting and replacement
- AWS provider resource timeout configuration
- CI/CD Terraform automation

## Sources Consulted
- HashiCorp Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform apply tutorial and error handling notes: https://developer.hashicorp.com/terraform/tutorials/cli/apply
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- HashiCorp Terraform `force-unlock` command reference: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- HashiCorp Terraform `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- HashiCorp Terraform resource timeout configuration documentation: https://developer.hashicorp.com/terraform/language/resources/configure#define-operation-timeouts
- HashiCorp Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform local backend documentation: https://developer.hashicorp.com/terraform/language/backend/local
- HashiCorp Terraform state storage and locking documentation: https://developer.hashicorp.com/terraform/language/state/backends

## Issues Found
- The post said Terraform updates the state file after each successful operation. Updated this to say Terraform updates state with the changes it made, matching the official apply documentation's description of state snapshots and error handling.
- The partial-apply section implied partial applies are always safe, failed resources are never in state, and rerunning apply only retries failed operations. Updated the wording to reflect that Terraform does not roll back partial applies, records completed changes it knows about, and a later apply plans and attempts the remaining required changes.
- The state lock example described `terraform force-unlock LOCK_ID` as checking lock status. Updated the comment because `force-unlock` releases a stuck lock; it is not a status-check command.
- The state backup section implied `terraform.tfstate.backup` is universal. Updated it to clarify that this applies to local state, while remote backends require their own versioning or backup process.

## Review Notes
Terraform CLI was not installed in the workspace, so command behavior was verified against official HashiCorp documentation rather than local `terraform -help` output. The remaining commands and flags in the post are current for Terraform 1.x, with the usual caveat that `-replace` requires Terraform v0.15.2 or later and saved plan files can contain sensitive values in cleartext.
