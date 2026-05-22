# Validation Summary: How to Use terraform plan -target for Faster Feedback

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform plan and apply commands
- Terraform resource targeting with `-target`
- Terraform refresh behavior and refresh-only mode
- Shell scripting for Terraform workflows

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform resource targeting tutorial: https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting
- Terraform `refresh` command reference and refresh-only guidance: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform resource address reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- Terraform dependency graph internals: https://developer.hashicorp.com/terraform/internals/graph

## Issues Found
- The debugging example described `terraform plan -target=aws_ecs_service.api -refresh-only` as showing "the full detail with refresh." In Terraform, `-refresh-only` is a special planning mode whose goal is to update Terraform state and root outputs to match remote objects, not to run a normal configuration-change plan with extra detail. Changed the comment to "Check whether remote drift would update Terraform state."
- The quoted `-target` warning text used older wording. Updated it to match the current Terraform documentation wording that the plan may not represent all changes requested by the current configuration.

## Review Notes
- The Terraform CLI was not installed in the local environment, so command behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
- The CI/CD script is intentionally described as simplified. It may miss module paths, resources with indented declarations, variable-only changes, and other indirect effects, so it should remain quick-feedback-only rather than a deployment gate.
