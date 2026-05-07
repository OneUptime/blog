# Validation Summary: How to Automate Workspace Creation in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu workspaces
- GitHub Actions
- Bash
- AWS GitHub Actions authentication

## Sources Consulted
- OpenTofu workspace select command docs: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu workspace new command docs: https://opentofu.org/docs/cli/commands/workspace/new/
- OpenTofu workspace delete command docs: https://opentofu.org/docs/cli/commands/workspace/delete/
- OpenTofu environment variables docs (`TF_WORKSPACE`): https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu standalone installation docs: https://opentofu.org/docs/intro/install/standalone/
- GitHub Actions event reference for `pull_request`, merged/closed behavior, and fork secret restrictions: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- `actions/checkout` official repository README and releases: https://github.com/actions/checkout and https://github.com/actions/checkout/releases
- `aws-actions/configure-aws-credentials` official repository README and releases: https://github.com/aws-actions/configure-aws-credentials and https://github.com/aws-actions/configure-aws-credentials/releases
- OpenTofu GitHub releases metadata to verify release asset naming: https://github.com/opentofu/opentofu/releases

## Issues Found
- The original `ensure-workspace.sh` checked `tofu workspace list` output with `grep`, which can miss the current workspace because `tofu workspace list` marks it with `*`. I replaced that logic with `tofu workspace select -or-create`, which is the current OpenTofu-supported way to select an existing workspace or create it if missing.
- The GitHub Actions install step used `https://github.com/opentofu/opentofu/releases/latest/download/tofu_linux_amd64.tar.gz`, but current OpenTofu release assets are versioned (for example, `tofu_1.11.6_linux_amd64.tar.gz`), so that URL does not resolve correctly. I replaced it with the officially documented installer script from `get.opentofu.org`.
- The workflow examples set `TF_WORKSPACE` at the job level while also calling workspace selection commands. OpenTofu documents that `TF_WORKSPACE` overrides workspace selection, so this can interfere with `tofu workspace select` and `tofu workspace delete`. I changed the workflow variable to `WORKSPACE_NAME` and kept the dedicated `TF_WORKSPACE` section only for the already-existing-workspace case.
- The post said the preview workflow runs on every pull request, but GitHub does not pass repository secrets to `pull_request` workflows triggered from forks. I constrained the example jobs to same-repository pull requests so the AWS credential steps are technically correct as written.
- The workflow examples referenced older action majors. I updated `actions/checkout` and `aws-actions/configure-aws-credentials` to current major versions shown in their official repositories.

## Review Notes
- `aws-actions/configure-aws-credentials` currently recommends OIDC as the preferred authentication model. The post's static-secret example remains valid, but OIDC would be a stronger future update.
- OpenTofu's workspace documentation notes that workspaces are convenient for parallel state instances, but are not recommended as a substitute for separate credentials or access boundaries in more complex deployment models.
