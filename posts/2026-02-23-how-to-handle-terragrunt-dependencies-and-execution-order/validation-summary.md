# Validation Summary: How to Handle Terragrunt Dependencies and Execution Order

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terragrunt
- Terraform/OpenTofu
- HCL
- Graphviz DOT
- Infrastructure as Code dependency graphs

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt DAG graph command reference: https://docs.terragrunt.com/reference/cli/commands/dag/graph/
- Terragrunt render command reference: https://docs.terragrunt.com/reference/cli/commands/render/
- Terragrunt list command reference: https://docs.terragrunt.com/reference/cli/commands/list/
- Terragrunt Run Queue feature documentation: https://docs.terragrunt.com/features/stacks/run-queue/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/

## Issues Found
- The post used deprecated Terragrunt CLI forms such as `run-all`, `graph-dependencies`, `render-json`, and `--terragrunt-log-level`. Updated examples to current forms: `run --all`, `dag graph`, `render --json`, and `--log-level`.
- The post referred to execution groups as the primary model. Updated this to Terragrunt's current run queue terminology while preserving the grouped example as a way to explain dependency levels.
- The cross-directory dependency section said external dependencies outside the scan scope would not be applied by `run-all`. Updated it to describe current external dependency behavior for `run --all` and the option to exclude external dependencies.
- The optimization section recommended `skip_outputs` for ordering-only dependencies. Replaced that with the `dependencies` block for ordering-only dependencies and clarified what `skip_outputs` does when a `dependency` block is still needed.
- The post said every `dependency` block should have `mock_outputs`. Narrowed this to cases where plans need to work against dependencies that may not yet have outputs in state.
- The destroy dry-run example used the deprecated `run-all` form. Updated it to `terragrunt run --all -- plan -destroy`.

## Review Notes
Terragrunt was not installed in the local environment, so CLI behavior was validated against the current official Terragrunt documentation rather than local `--help` output.
