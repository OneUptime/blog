# Validation Summary: How to Use Terramate with OpenTofu for Stack Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terramate CLI
- OpenTofu
- HCL
- Git change detection
- GitHub Actions
- AWS S3 backend locking with DynamoDB

## Sources Consulted
- Terramate CLI installation docs: https://terramate.io/docs/cli/installation
- Terramate OpenTofu onboarding docs: https://terramate.io/docs/get-started/opentofu
- Terramate stack creation command docs: https://terramate.io/docs/cli/reference/cmdline/create
- Terramate code generation docs: https://terramate.io/docs/cli/code-generation/
- Terramate metadata variable docs: https://terramate.io/docs/cli/reference/variables/metadata
- Terramate run command docs: https://terramate.io/docs/cli/reference/cmdline/run
- Terramate list command docs: https://terramate.io/docs/cli/reference/cmdline/list
- Terramate Git change detection docs: https://terramate.io/docs/cli/change-detection/integrations/git
- Terramate GitHub Actions automation docs: https://terramate.io/docs/cli/automation/github-actions/
- OpenTofu setup GitHub Action: https://github.com/opentofu/setup-opentofu
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- Terramate GitHub releases: https://github.com/terramate-io/terramate/releases
- OpenTofu GitHub releases: https://github.com/opentofu/opentofu/releases

## Issues Found
- The Linux Terramate install command used a non-existent current release asset name (`terramate_linux_amd64.tar.gz`). Replaced it with the official Terramate apt repository installation flow.
- The verification command used `terramate --version`; this works, but official docs use `terramate version`, so the post now uses the documented command.
- The initial root config claimed to tell Terramate which binary to use by setting `TF_CLI_ARGS`, which does not configure the OpenTofu binary. Replaced it with a minimal valid root config.
- The `terraform { tofu_binary = "tofu" }` Terramate config block is invalid. Replaced that section with the correct Terramate pattern: pass `tofu` directly after `terramate run --`.
- The stack creation example showed a custom description in generated output but did not pass `--description` to `terramate create`. Added the flag to the networking stack creation command.
- The generated backend key used `${terramate.stack.path}`, which expands to a path object rather than a usable string. Changed it to `${terramate.stack.path.relative}`.
- The change detection explanation implied a fixed default-branch comparison. Updated it to describe Git change detection with an explicit `--git-change-base` ref.
- The GitHub Actions workflow installed OpenTofu manually and installed Terramate with Homebrew on an Ubuntu runner. Replaced OpenTofu setup with `opentofu/setup-opentofu@v2` and Terramate installation with the official apt repository.
- The GitHub Actions workflow ran `tofu plan` without initializing stacks. Added a changed-stacks `tofu init` step before planning.

## Review Notes
- OpenTofu's current S3 backend supports both native S3 lockfiles and DynamoDB locking; the DynamoDB example remains technically valid.
- I verified the Terramate HCL snippets with Terramate CLI v0.16.0 in a disposable local project.
