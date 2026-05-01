# Validation Summary: How to Detect Infrastructure Drift with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- GitHub Actions
- AWS IAM / OIDC authentication for GitHub Actions

## Sources Consulted
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.9/cli/commands/apply/
- OpenTofu `refresh` command: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu `init` command: https://opentofu.org/docs/v1.11/cli/commands/init/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs on `GITHUB_TOKEN` permissions: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token
- `actions/checkout` README: https://github.com/actions/checkout
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu
- `aws-actions/configure-aws-credentials` README: https://github.com/aws-actions/configure-aws-credentials/blob/main/README.md
- `actions/github-script` README: https://github.com/actions/github-script

## Issues Found
- The GitHub Actions drift-detection step would not reliably capture OpenTofu exit code `2` under GitHub's default Bash settings because `run` steps use error-exit behavior and explicit `bash` uses `-eo pipefail`. I updated the snippet to temporarily disable `-e`, capture the plan exit code, write it to `$GITHUB_OUTPUT`, and fail only on real errors (`exit code 1`).
- The standalone shell example for `-detailed-exitcode` did not handle exit code `1`, which would let a failed `tofu plan` fall through as a successful script exit. I added an explicit error branch so automation fails correctly on planning errors.
- The workflow was missing explicit `GITHUB_TOKEN` permissions required for the documented behavior. I added `contents: read`, `id-token: write`, and `issues: write` so checkout, AWS OIDC authentication, and issue creation match the official guidance.
- The example used older action major versions. I updated `actions/checkout` from `v4` to `v6`, `opentofu/setup-opentofu` from `v1` to `v2`, `aws-actions/configure-aws-credentials` from `v4` to `v6`, and `actions/github-script` from `v7` to `v9` to match current official READMEs.
- The OpenTofu setup action's wrapper can interfere with exit-code and output-sensitive workflows. Because this example depends on `-detailed-exitcode`, I set `tofu_wrapper: false` per the action README guidance.

## Review Notes
- `tofu plan -refresh-only` is correctly described as refresh-only mode: it updates state and root module outputs to reflect changes made to remote objects outside OpenTofu.
- `tofu apply -refresh-only` is correctly described as accepting intentional drift by updating state without modifying real infrastructure resources.
- `tofu init -lockfile=readonly` is valid and appropriate for CI when you want provider lockfile changes to fail rather than mutate the repository.
