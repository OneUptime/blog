# Validation Summary: How to Use Terraform with Incremental Applies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform resource targeting
- Terraform saved plan files
- Terraform input variables
- Terragrunt
- GitHub Actions
- Bash
- Cron

## Sources Consulted
- Terraform CLI plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform create a plan tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- Terraform apply tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/apply
- Terraform CLI commands overview: https://developer.hashicorp.com/terraform/cli/commands
- Terragrunt run command documentation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt Run Queue documentation: https://docs.terragrunt.com/features/stacks/run-queue/
- Terragrunt HCL blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/

## Issues Found
- The post described incremental applies as reading only the "relevant state" in general. Terraform targeting does not make a monolithic state file partial in that way, so the wording was changed to clarify that smaller state reads are a benefit of split projects.
- The post presented `terraform apply -target=...` as a normal incremental workflow. Terraform documents `-target` for exceptional circumstances and warns against routine use, so the targeted apply section now explicitly states that caveat.
- The Terragrunt example used older-style syntax: `terragrunt run-all apply --terragrunt-include-dir compute/`. It was updated to current syntax using `terragrunt run --all --queue-include-dir "compute/**" -- apply`.
- The Terragrunt dependency claim implied dependencies would always be applied automatically. The wording now says Terragrunt orders selected units by dependency graph and that dependencies must be included in the queue when they need to run.
- The plan-file section implied you could generate multiple targeted saved plans up front and then apply them later. Because saved plans are tied to the state at plan time, the example now generates and applies each staged plan sequentially.
- The feature-flag example claimed only the new service would be created. The wording now qualifies that this is true only when there are no other pending changes or drift.
- The weekly cron example used `*/0`, which is invalid because a cron step cannot be zero. It was corrected to `0 9 * * 1`.

## Review Notes
The automated target-detection Bash script is intentionally heuristic and the post now preserves that caveat. It can still miss changes from variables, locals, provider configuration, generated files, renamed blocks, or shared modules, so it should not be treated as a complete dependency analysis tool.
