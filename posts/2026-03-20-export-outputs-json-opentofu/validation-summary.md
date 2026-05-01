# Validation Summary: How to Export Outputs as JSON in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- `jq`
- GitHub Actions
- Bash
- Kubernetes (`kubectl`)
- Helm

## Sources Consulted
- OpenTofu `tofu output` command docs: https://opentofu.org/docs/cli/commands/output/
- OpenTofu CLI workspaces docs: https://opentofu.org/docs/cli/workspaces/
- OpenTofu `remote` backend docs: https://opentofu.org/docs/language/settings/backends/remote/
- OpenTofu cloud backend settings docs: https://opentofu.org/docs/v1.11/cli/cloud/settings/
- GitHub Actions workflow commands docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Kubernetes `kubectl create configmap` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/

## Issues Found
- The GitHub Actions example said it was storing JSON "in environment" but actually wrote to `GITHUB_OUTPUT`, which creates a step output. I corrected the comment to match the mechanism being used.
- The GitHub Actions example wrote JSON directly to `GITHUB_OUTPUT` without compacting it first. GitHub's output file format requires single-line `name=value` entries unless multiline syntax is used. I changed the command to compact the JSON with `jq -c` before writing it.
- The GitHub Actions and Kubernetes examples piped unquoted shell variables through `echo`, which can alter JSON via shell word splitting and glob expansion. I changed those commands to `printf '%s\n' "$OUTPUTS" | jq ...` so the JSON is passed safely and predictably.

## Review Notes
- The post is technically relevant and salvageable; after the fixes above, the examples align with the current official documentation.
- OpenTofu's official docs note that `tofu output -json` will display sensitive values in plain text, even though the JSON also includes a `sensitive` flag. The post's filtering example is valid, but readers should still handle JSON exports carefully in CI and scripts.
- Local execution was not possible in this workspace because the `tofu` binary is not installed, so command behavior was validated against official documentation rather than by running the CLI locally.
