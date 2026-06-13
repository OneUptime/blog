# Validation Summary: How to Use Infracost for IaC Cost Estimation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Infracost CLI
- Infracost GitHub Actions
- GitLab CI
- Terraform
- Terragrunt
- Open Policy Agent
- AWS infrastructure resources
- YAML, HCL, and Rego configuration

## Sources Consulted
- Infracost Get Started docs: https://www.infracost.io/docs/
- Infracost CLI commands docs: https://www.infracost.io/docs/features/cli_commands/
- Infracost usage costs docs: https://www.infracost.io/docs/features/usage_based_resources/
- Infracost config file docs: https://www.infracost.io/docs/features/config_file/
- Infracost Terragrunt docs: https://www.infracost.io/docs/features/terragrunt/
- Infracost environment variables docs: https://www.infracost.io/docs/features/environment_variables/
- Infracost GitHub Actions docs: https://www.infracost.io/docs/integrations/github_actions/
- Infracost GitHub Actions repository README: https://github.com/infracost/actions
- Infracost GitLab CI docs: https://www.infracost.io/docs/integrations/gitlab_ci/
- Infracost Open Policy Agent integration docs: https://www.infracost.io/docs/integrations/open_policy_agent/
- Infracost usage file example: https://github.com/infracost/infracost/blob/master/infracost-usage-example.yml
- Current Infracost CLI 2.2.9 help output from the official install script binary

## Issues Found
- Updated the Linux install command from the old `infracost/infracost` repository path to the current `infracost/cli` install script path.
- Replaced local `infracost breakdown`, `diff`, `configure`, `list`, `upload`, and old output-format examples with current `infracost scan`, `infracost inspect`, and authentication commands where applicable.
- Changed local branch comparison guidance to use current scan/inspect behavior and clarified that full cost diffs are shown in CI/CD pull request comments.
- Corrected the GitHub Actions PR comment step to use the documented `infracost comment github` CLI command instead of the obsolete `infracost/actions/comment@v1` action reference.
- Updated the GitLab CI image to the maintained `infracost/infracost:ci-0.10` image shown in the official GitLab CI docs and added `--behavior update`.
- Replaced the unsupported YAML policy example and invalid `--policy-path` usage on `breakdown` with an OPA/Rego policy example used with `infracost comment`.
- Removed an unsupported S3 usage-file egress key and added the current `infracost.yml` `usage_file` configuration pattern for `infracost scan`.
- Updated Terragrunt, troubleshooting, sample output, and final wording to align with current CLI behavior.

## Review Notes
The GitHub Actions and GitLab CI sections intentionally retain `breakdown`, `diff`, and `comment` commands because the official CI/action examples still document the 0.10-style CI workflow for pull request diffs, while the current local CLI uses `scan` and `inspect`.
