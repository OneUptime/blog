# Validation Summary: How to Use Terragrunt run --all for Multi-Module Operations with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt CLI multi-unit orchestration
- OpenTofu CLI commands and flags
- Terragrunt HCL configuration
- GitHub Actions CI/CD snippets

## Sources Consulted
- Terragrunt CLI `run` command reference — https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt global flags reference — https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt CLI Redesign migration guide — https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt Run Queue documentation — https://docs.terragrunt.com/features/stacks/run-queue/
- Terragrunt queue-to-filter migration guide — https://docs.terragrunt.com/migrate/queue-to-filter/
- Terragrunt deprecated attributes migration guide — https://docs.terragrunt.com/migrate/deprecated-attributes/
- Terragrunt HCL blocks reference for `exclude` — https://docs.terragrunt.com/reference/hcl/blocks/#exclude
- Terragrunt `dag graph` command reference — https://docs.terragrunt.com/reference/cli/commands/dag/graph
- OpenTofu `apply` command reference — https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `plan` command reference — https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `fmt` command reference — https://opentofu.org/docs/cli/commands/fmt/
- GitHub Actions contexts reference — https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs

## Issues Found
- **Deprecated Terragrunt command name**: The post used `terragrunt run-all`, which Terragrunt's current docs replace with `terragrunt run --all`. Updated the title, description, headings, prose, and command examples.
- **Deprecated Terragrunt flag names**: Replaced `--terragrunt-working-dir`, `--terragrunt-parallelism`, `--terragrunt-non-interactive`, and `--terragrunt-ignore-dependency-errors` with current CLI forms such as `--working-dir`, `--parallelism`, `--non-interactive`, and `--queue-ignore-errors`.
- **Legacy queue exclusion flag**: Replaced `--terragrunt-exclude-dir` guidance with modern `--filter` expressions, which Terragrunt recommends over queue include/exclude flags.
- **Removed `skip` attribute**: The post used `skip = true`, which Terragrunt documents as deprecated/removed. Replaced it with an `exclude` block using `if = true` and `actions = ["all"]`.
- **Incorrect apply confirmation behavior**: The post said `run-all apply` prompts for confirmation. Current Terragrunt docs state that `run --all apply` and `run --all destroy` automatically add `-auto-approve`; updated the comments accordingly.
- **Failure handling semantics**: The post described "stop on first error" as the default. Current Terragrunt exposes `--queue-ignore-errors` for continuing and `--fail-fast` for stopping immediately; updated the examples.
- **OpenTofu flag forwarding**: Updated examples that pass OpenTofu flags, such as `-auto-approve`, `-out=tfplan`, and `fmt -check`, to use Terragrunt's `--` separator and the documented OpenTofu single-dash flag spelling.
- **Graph command rename**: Replaced deprecated `graph-dependencies` with `terragrunt dag graph`.
- **Execution-order preview**: Replaced log-grepping a real plan run with `terragrunt list --as plan -l`, which is the documented way to inspect the run queue.
- **GitHub Actions environment path**: Replaced `environments/${{ github.base_ref }}` with `environments/prod`; `github.base_ref` is only available for pull request events and is a branch name, not necessarily an environment directory.

## Review Notes
- Terragrunt and OpenTofu were not installed in the local environment, so validation was performed against current official documentation rather than local `--help` output.
- Terragrunt's current docs still show some backwards-compatible aliases, but the post now uses the current non-deprecated forms where the docs recommend migration.
