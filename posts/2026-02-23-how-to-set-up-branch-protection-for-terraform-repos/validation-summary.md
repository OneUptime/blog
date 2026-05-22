# Validation Summary: How to Set Up Branch Protection for Terraform Repos

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- GitHub branch protection rules
- GitHub Actions
- GitHub Environments
- GitHub repository rulesets
- GitHub CLI
- GitLab protected branches
- GitLab CI/CD
- Aqua Security Trivy

## Sources Consulted
- GitHub Docs, REST API endpoints for protected branches: https://docs.github.com/en/rest/branches/branch-protection
- GitHub Docs, workflow syntax for GitHub Actions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs, deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Docs, available rules for repository rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- GitHub Docs, REST API endpoints for repository tags: https://docs.github.com/en/rest/repos/tags
- GitLab Docs, protected branches and branch rules: https://docs.gitlab.com/user/project/repository/branches/protected/
- GitLab Docs, Docker executor entrypoint behavior: https://docs.gitlab.com/runner/executors/docker/
- GitLab Docs, using Docker images in CI/CD: https://docs.gitlab.com/ci/docker/using_docker_images/
- HashiCorp Developer, terraform validate command: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp Developer, terraform init command: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Developer, Terraform v1.15 upgrade guide: https://developer.hashicorp.com/terraform/language/upgrade-guides
- Aqua Security tfsec repository: https://github.com/aquasecurity/tfsec
- Aqua Security Trivy Action repository: https://github.com/aquasecurity/trivy-action
- Aqua Security Trivy Terraform documentation: https://trivy.dev/docs/latest/coverage/iac/terraform/

## Issues Found
- The introduction said the guide covered Bitbucket, but the post only includes GitHub and GitLab instructions. Removed the Bitbucket mention so the scope matches the content.
- The GitHub required status-check workflow used a `paths` filter. GitHub documents that skipped workflows can leave associated required checks pending, which can block unrelated pull requests. Removed the path filter so required checks run consistently on pull requests to `main`.
- The security scan examples used tfsec. Aqua now directs tfsec users toward Trivy, so the GitHub and GitLab examples were updated to use Trivy for Terraform/IaC configuration scanning.
- The GitLab CI examples used the official Terraform Docker image without overriding its entrypoint. GitLab Runner's Docker executor does not override image entrypoints by default, so the jobs now use `image:name` with `entrypoint: [""]`.
- The GitLab protected branch settings used older UI wording. Updated the path and labels to match current Branch rules wording.
- The GitHub tag protection example used deprecated tag protection rules. Updated it to recommend a tag ruleset with creation, update, and deletion restrictions.
- The emergency workflow passed `workflow_dispatch` input directly into `terraform apply -target` without shell quoting. Quoted the target value in the command.

## Review Notes
Terraform was not installed in the local environment, so Terraform commands were verified against HashiCorp documentation rather than executed locally. The GitHub CLI `gh api` command syntax was checked against local `gh api --help` and GitHub REST API documentation.
