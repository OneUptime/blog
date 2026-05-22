# Validation Summary: How to Use Terragrunt Skip Flag for Selective Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- OpenTofu
- Terragrunt
- HCL
- GitHub Actions
- Infrastructure as Code

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL attributes reference: https://docs.terragrunt.com/reference/hcl/attributes/
- Terragrunt run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt dag graph command reference: https://docs.terragrunt.com/reference/cli/commands/dag/graph/

## Issues Found
- The post used the removed top-level `skip` attribute. Current Terragrunt removed `skip`; I replaced examples and explanations with the supported `exclude` block.
- The post used deprecated `run-all` commands. I updated command examples to `terragrunt run --all ... -- <tofu/terraform command>`.
- The post used deprecated `--terragrunt-*` flag names. I updated them to current flags such as `--queue-include-dir`, `--queue-exclude-dir`, `--queue-include-external`, `--queue-ignore-errors`, `--non-interactive`, and `--log-level`.
- The post described `--terragrunt-strict-include` as the way to prevent dependency auto-inclusion. Current Terragrunt performs strict inclusion by default and `--queue-strict-include` is deprecated, so I corrected that section.
- The post used `--terragrunt-ignore-external-dependencies`; this maps to deprecated `--queue-exclude-external`, and external dependencies are now excluded by default. I replaced the guidance with `--queue-include-external` for explicitly including external dependencies.
- The post used `graph-dependencies`. I updated it to the current `terragrunt dag graph` command.
- The destroy-safety example relied on a non-standard `TERRAGRUNT_COMMAND` environment variable. I replaced it with an `exclude` block scoped to `actions = ["destroy"]`.
- The feature flag pattern used an ad hoc environment variable. I updated it to Terragrunt's supported `feature` block and `--feature` CLI option.

## Review Notes
The article now targets current Terragrunt behavior rather than legacy `skip` usage. The path and slug still refer to "skip flag", but the content explains that `skip` was removed and shows the supported replacement.
