# Validation Summary: How to Set Up Infracost in CI/CD Pipelines for Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Infracost CLI
- Infracost GitHub Actions
- GitHub Actions
- GitLab CI
- Azure DevOps Pipelines
- YAML
- jq and bc shell utilities

## Sources Consulted
- Infracost CLI commands documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost CI/CD integration documentation: https://www.infracost.io/docs/integrations/cicd/
- Infracost config file documentation: https://www.infracost.io/docs/features/config_file/
- Infracost usage-based resources documentation: https://www.infracost.io/docs/features/usage_based_resources/
- Infracost GitHub Actions README: https://github.com/infracost/actions
- Infracost GitHub Actions setup action definition: https://github.com/infracost/actions/blob/master/setup/action.yml
- Infracost Azure DevOps integration README: https://github.com/infracost/infracost-azure-devops
- Infracost GitLab CI template README: https://gitlab.com/infracost/infracost-gitlab-ci
- Infracost CLI v0.10.44 help output from the official `infracost/infracost:ci-0.10` Docker image

## Issues Found
- The GitHub Actions example used `infracost/actions/comment@v1`. Current Infracost GitHub Actions documentation marks `setup` as the legacy CLI-install action and shows PR comments being posted with `infracost comment github`. I changed the step to call `infracost comment github` with `--path`, `--repo`, `--pull-request`, `--github-token`, and `--behavior`.
- The GitLab CI example used `git checkout $CI_MERGE_REQUEST_TARGET_BRANCH_NAME -- $TF_ROOT`, which depends on the target branch being available locally in the runner checkout. I changed it to clone the target branch into `/tmp/base` and generate the baseline from `/tmp/base/$TF_ROOT`, matching the documented manual CI pattern more closely.
- The Azure DevOps example used `git checkout $(System.PullRequest.TargetBranch)`, which can refer to a full ref and is not guaranteed to be a local branch in the pipeline checkout. I changed it to clone the target branch using `$(System.PullRequest.TargetBranchName)` and `$(System.AccessToken)`, then generate the baseline from `/tmp/base/environments/production`.
- The explanation said Infracost analyzes the Terraform plan, but the shown commands use Infracost's direct Terraform configuration parsing path. I changed the wording to say it analyzes Terraform configuration or a plan.

## Review Notes
The post uses Infracost's manual CLI integration pattern with `breakdown`, `diff`, `comment`, and `upload`. This remains documented for CI/CD usage, but Infracost currently recommends source-control apps and the newer GitHub `diff`/`scan` actions for new GitHub integrations where possible.
