# Validation Summary: How to Handle Complex Dependency Graphs in Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terragrunt
- HCL
- AWS Systems Manager Parameter Store
- AWS Security Groups
- GraphViz DOT

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt `dag graph` command reference: https://docs.terragrunt.com/reference/cli/commands/dag/graph/
- Terragrunt `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt `list` command reference: https://docs.terragrunt.com/reference/cli/commands/list/
- Terragrunt Run Queue documentation: https://docs.terragrunt.com/features/stacks/run-queue/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terraform AWS provider `aws_ssm_parameter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform AWS provider `aws_security_group` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_group

## Issues Found
- Replaced deprecated Terragrunt CLI forms (`graph-dependencies`, `run-all`, and `--terragrunt-*` flags) with current documented equivalents such as `dag graph`, `run --all`, `--parallelism`, `--filter`, and `--non-interactive`.
- Corrected the cross-environment dependency guidance. Current Terragrunt excludes external dependencies by default unless they are explicitly included, so the old `--terragrunt-ignore-external-dependencies` example was outdated.
- Corrected the mock outputs explanation. Mock outputs do not generally prevent Terragrunt from running dependency output resolution when real outputs are available; they allow commands such as `plan` to proceed when dependency outputs are unavailable and the command is allowed.
- Updated the single-module destroy guidance to use `--destroy-dependencies-check`, which is now required to enable warnings about dependent units.
- Fixed the generated dependency document script. `terragrunt dag graph` emits DOT, not Mermaid, so the fenced code block now uses `dot` and no longer wraps DOT output in an invalid Mermaid `graph TD` block.

## Review Notes
The Terragrunt concepts in the post are accurate after the CLI updates: `dependency` and `dependencies` blocks participate in the run queue, apply/plan ordering runs dependencies before dependents, destroy ordering is reversed, and diamond dependency graphs are valid as long as the graph remains acyclic.
