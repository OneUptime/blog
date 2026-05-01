# Validation Summary: How to Destroy Infrastructure with tofu destroy

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu CLI
- HCL
- GitHub Actions
- Bash

## Sources Consulted
- OpenTofu `destroy` command docs: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `state rm` command docs: https://opentofu.org/docs/cli/commands/state/rm/
- OpenTofu `workspace select` command docs: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu workspace behavior docs: https://opentofu.org/docs/cli/workspaces/
- OpenTofu resource behavior and `prevent_destroy` docs: https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu provider requirements docs: https://opentofu.org/docs/language/providers/requirements/
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu
- GNU Bash Reference Manual, Filename Expansion: https://www.gnu.org/s/bash/manual/html_node/Filename-Expansion.html

## Issues Found
- The workspace example said it would "Destroy a specific workspace", but `tofu destroy` operates on the currently selected workspace's managed resources rather than deleting the workspace itself. I changed the comment to "Destroy resources in a specific workspace" to match OpenTofu's documented workspace behavior.
- The sample verification used `ls *.txt` after destruction and claimed it should show no files. In Bash, when `nullglob` is not enabled, an unmatched `*.txt` pattern is left unchanged, so `ls` would typically error instead of quietly producing no output. I changed both verification commands to `find . -maxdepth 1 -name "*.txt"` so the example behaves correctly before and after destruction.
- The CI example used `opentofu/setup-opentofu@v1`, while the current official action README documents `opentofu/setup-opentofu@v2`. I updated the workflow snippet to use `@v2`.

## Review Notes
- The post's OpenTofu command usage is otherwise accurate: `tofu destroy` is a convenience alias for `tofu apply -destroy`, saved destroy plans can be created with `tofu plan -destroy -out=...` and applied with `tofu apply`, and `prevent_destroy` correctly blocks destroy plans while the resource block remains in configuration.
- The workflow pins `tofu_version: "1.9.0"`. That is a valid version pin, but the current OpenTofu documentation is on 1.11.x, so this pinned version should be reviewed periodically rather than assumed to be the latest.
