# Validation Summary: How to Handle Module Versioning Across Environments in OpenTofu

## Status
validated

## Post Type
Tutorial / Best Practice Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform/OpenTofu HCL module sources (Git and Registry)
- OpenTofu Registry (`registry.opentofu.org`)
- GitHub Actions (workflow_dispatch, peter-evans/create-pull-request, actions/checkout)
- Bash / sed

## Sources Consulted
- OpenTofu CLI documentation — `tofu -chdir` global option: https://opentofu.org/docs/cli/commands/
- OpenTofu module sources (Git, Registry): https://opentofu.org/docs/language/modules/sources/
- OpenTofu version constraint syntax (`~>` pessimistic operator): https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu Registry: https://opentofu.org/docs/internals/module-registry-protocol/
- GitHub Actions `workflow_dispatch` and expression contexts (`${{ inputs.* }}`): https://docs.github.com/en/actions/learn-github-actions/contexts
- `peter-evans/create-pull-request` action: https://github.com/peter-evans/create-pull-request
- `actions/checkout@v4`: https://github.com/actions/checkout

## Issues Found
1. **GitHub Actions workflow used a bash variable instead of a workflow input expression.** The original `sed` command referenced `${module_name}` (an undefined bash variable that would expand to an empty string) instead of `${{ inputs.module_name }}`. This would have produced a broken `sed` substitution like `s/ = ".*"/ = "v2.1.0"/`, which does not match the intended `module_name = "..."` lines in `versions.tf`. Fixed by replacing both occurrences of `${module_name}` with `${{ inputs.module_name }}` so the GitHub Actions expression context is used consistently with the rest of the step.

## Review Notes
- The `~> 2.0` constraint is correctly described as allowing minor and patch updates within `2.x` (i.e. `>= 2.0, < 3.0`). Authors should be aware that `~> 2.0.0` would only allow patch updates within `2.0.x`.
- The Git source URL with `?ref=main` pulls whatever the branch points to at module download time. Re-running `tofu init` (or `tofu init -upgrade`) is required to pick up new commits — worth noting for readers expecting automatic updates.
- `peter-evans/create-pull-request@v5` is still supported, but newer major versions (`v6`, `v7`) exist; the example will continue to work as-is.
- The `sed -i` substitution will rewrite any matching `name = "value"` line in the file, including comments and other unrelated assignments that share the same key. For production use, scoping the substitution (e.g. using `tofu fmt`-aware tooling like `hcledit`) is more robust, but the simple `sed` example is a reasonable illustration.
