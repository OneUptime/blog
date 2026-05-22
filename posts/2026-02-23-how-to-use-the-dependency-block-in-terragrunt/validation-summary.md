# Validation Summary: How to Use the dependency Block in Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- HCL configuration
- Infrastructure as Code module dependencies

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terraform `terraform_remote_state` data source reference: https://developer.hashicorp.com/terraform/language/state/remote-state-data

## Issues Found
- The post said `terragrunt apply` ensures dependencies have been applied. A single-unit Terragrunt command reads dependency outputs but does not apply upstream modules for you; ordering is handled during multi-module runs. Updated the wording to distinguish output reading from multi-module dependency ordering.
- The post used the older `terragrunt run-all apply` command. Current Terragrunt documentation describes multi-unit execution through `terragrunt run --all -- apply`. Updated the command and related references to `run --all`.
- The `skip_outputs` description said Terragrunt would not read the state file. Official docs define `skip_outputs` as skipping `terragrunt output`; updated the wording to say it does not attempt to read outputs.

## Review Notes
The Terragrunt HCL examples use valid `dependency`, `dependencies`, `mock_outputs`, `mock_outputs_allowed_terraform_commands`, `mock_outputs_merge_strategy_with_state`, and `skip_outputs` attributes according to the current Terragrunt HCL reference. The `mock_outputs_merge_strategy_with_state = "shallow"` example is current; the older `mock_outputs_merge_with_state` attribute is deprecated and is not used in the post.
