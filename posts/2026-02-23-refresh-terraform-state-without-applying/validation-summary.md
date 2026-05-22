# Validation Summary: How to Refresh Terraform State Without Applying Changes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform refresh-only planning and apply modes
- Terraform state locking
- Shell scripting for CI/CD

## Sources Consulted
- Terraform `refresh` command reference: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform refresh-only mode tutorial: https://developer.hashicorp.com/terraform/tutorials/state/refresh
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform `force-unlock` command reference: https://developer.hashicorp.com/terraform/cli/commands/force-unlock

## Issues Found
- The CI/CD shell example used `set -e` before `terraform plan -refresh-only -detailed-exitcode`. Because Terraform returns exit code `2` when a non-empty diff is detected, `set -e` would cause the script to exit before it could capture and handle drift. Added a temporary `set +e` around the plan command and restored `set -e` after capturing `$?`.
- The deleted-resource example said a refreshed deleted resource could be "marked as tainted." Refresh-only state reconciliation records that the remote object is missing; tainting is a separate Terraform state operation. Changed the comment to say the resource is recorded as missing.

## Review Notes
- `terraform refresh` is correctly described as deprecated and effectively equivalent to `terraform apply -refresh-only -auto-approve`.
- `terraform plan -refresh-only` and `terraform apply -refresh-only` are available in Terraform v0.15.4 and later. The post does not target older Terraform versions, so this is acceptable.
- The post's `-target` examples are syntactically valid, but Terraform's documentation recommends resource targeting only for exceptional circumstances because it can lead to incomplete planning context.
