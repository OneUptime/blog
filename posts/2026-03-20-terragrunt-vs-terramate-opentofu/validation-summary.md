# Validation Summary: How to Compare Terragrunt vs Terramate for OpenTofu Orchestration

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- OpenTofu
- Terragrunt
- Terramate
- HCL configuration
- Infrastructure as Code orchestration

## Sources Consulted
- Terragrunt HCL attributes: https://docs.terragrunt.com/reference/hcl/attributes
- Terragrunt HCL blocks: https://docs.terragrunt.com/reference/hcl/blocks
- Terragrunt `run` command: https://docs.terragrunt.com/reference/cli/commands/run
- Terramate stack configuration: https://terramate.io/docs/cli/stacks/configuration
- Terramate change detection: https://terramate.io/docs/cli/change-detection/
- Terramate `run` command: https://terramate.io/docs/cli/reference/cmdline/run
- Terramate code generation: https://terramate.io/docs/cli/code-generation/
- Terramate `generate_hcl` block: https://terramate.io/docs/cli/reference/blocks/generate-hcl
- Terramate `generate_file` block: https://terramate.io/docs/cli/reference/blocks/generate-file
- Terramate metadata variables: https://terramate.io/docs/cli/reference/variables/metadata
- Terramate outputs sharing: https://terramate.io/docs/cli/orchestration/outputs-sharing
- OpenTofu backend configuration: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu S3 backend: https://opentofu.org/docs/v1.9/language/settings/backends/s3/

## Issues Found
- The post said Terragrunt had no built-in change detection and needed external tooling. Current Terragrunt documentation includes `run --all --filter-affected` and git-based filters, so the comparison table was updated.
- The post referred to `run-all` orchestration. Current Terragrunt documentation uses `terragrunt run --all`, so the wording was updated.
- The Terramate stack description said each directory is an independent stack. Terramate detects stacks by the presence of a `stack {}` block, so the wording was corrected.
- The Terramate backend example used `${terramate.stack.path}` as a string. Terramate documents `terramate.stack.path` as an object, so the example now uses `${terramate.stack.path.relative}`.
- The Terramate stack example used a placeholder ID. It was replaced with a UUID-style value that matches Terramate's recommended stack ID format.
- The dependency comparison implied Terramate `after` stacks are general dependency management. Terramate documents `after` / `before` as execution order, with experimental `input` / `output` blocks used for shared data, so the table was clarified.
- The Terragrunt commercial platform row named Gruntwork rather than the current product name. It was updated to Terragrunt Scale.

## Review Notes
The examples are illustrative and still omit operational prerequisites such as existing S3 state buckets, credentials, and `tofu init`. The Terramate outputs sharing feature is documented as experimental, so teams should check the current Terramate release notes before adopting it broadly.
