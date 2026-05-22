# Validation Summary: How to Implement Plan and Apply Stages in CI/CD for Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI
- Terraform plan and apply workflows
- GitHub Actions
- GitLab CI/CD
- AWS GitHub Actions OIDC authentication
- jq

## Sources Consulted
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform show command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform fmt command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terraform workspace select command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- GitHub Actions workflow syntax: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- GitHub Actions workflow artifacts: https://docs.github.com/actions/guides/storing-workflow-data-as-artifacts
- aws-actions/configure-aws-credentials OIDC documentation: https://github.com/aws-actions/configure-aws-credentials
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/

## Issues Found
- The introduction and basic workflow claimed that the post-merge apply step executes the same saved PR plan, but the GitHub Actions example actually runs a fresh apply. Updated the wording to distinguish saved-plan applies from fresh final plan-and-apply workflows.
- The GitHub Actions examples used `aws-actions/configure-aws-credentials` with `role-to-assume` but did not grant `id-token: write`, which is required for GitHub OIDC role assumption. Added the permission to both workflows.
- The GitHub plan step piped `terraform plan` through `tee` without `set -o pipefail`, so a Terraform plan failure could be hidden by a successful `tee`. Added `set -o pipefail` and removed the unused captured exit-code output.
- The saved-plan fallback example ran a fresh apply after any failed saved apply, which could apply unreviewed changes and also mask non-staleness failures. Changed it to generate and display a fresh plan, then fail so the new plan can be reviewed.

## Review Notes
- Terraform 1.7.0 is older than the current Terraform release, but the commands and flags used in the post remain valid for the pinned version and current Terraform CLI documentation.
- Terraform saved plan files can contain sensitive data in cleartext, so plan artifacts should be protected according to the CI platform's artifact access controls.
