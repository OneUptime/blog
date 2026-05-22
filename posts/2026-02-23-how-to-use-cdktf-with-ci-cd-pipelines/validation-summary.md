# Validation Summary: How to Use CDKTF with CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform CLI
- GitHub Actions
- GitLab CI/CD
- AWS credentials and OIDC authentication
- CI/CD caching and deployment environments

## Sources Consulted
- HashiCorp CDKTF deployment patterns: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/deployment-patterns
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF stacks documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/stacks
- HashiCorp setup-terraform action README: https://github.com/hashicorp/setup-terraform
- HashiCorp Terraform CLI install documentation: https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli
- GitHub Actions workflow syntax and permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub OIDC with AWS documentation: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- actions/github-script documentation: https://github.com/actions/github-script
- GitLab CI/CD pipelines documentation: https://docs.gitlab.com/ci/pipelines/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/

## Issues Found
- CDKTF is now deprecated by HashiCorp as of December 10, 2025. Added a note so readers understand the current support status before adopting these patterns.
- The GitHub Actions example defined `CDKTF_VERSION: "0.20.0"` but did not use it to install CDKTF. Removed the unused and stale variable.
- The PR comment example used an invalid JavaScript template literal containing unescaped Markdown backticks. Replaced it with a safe array join and added `await` to the GitHub API call.
- The PR comment job did not explicitly grant token permissions for commenting. Added `contents: read` and `pull-requests: write` to the plan job.
- Several examples used `hashicorp/setup-terraform@v3` or omitted Terraform installation before `cdktf diff` / `cdktf deploy`. Updated examples to install Terraform with `hashicorp/setup-terraform@v4`.
- The GitLab CI example used `npm install -g terraform`, which is not HashiCorp's official Terraform CLI installation method. Replaced it with HashiCorp's Debian package repository installation steps for the `node:20` image.
- The GitLab and GitHub caching examples cached `node_modules/` while using `npm ci`, which removes `node_modules` before installing. Updated the cache paths to cache npm's package cache and CDKTF generated bindings instead.
- `cdktf diff` requires a stack name when the app has more than one stack. Updated plan and drift examples to use a placeholder stack name with comments telling readers to replace it.
- The `cdktf get` cache comment implied the command only runs when a cache is stale. Updated it to match the CLI behavior: it generates missing provider and module bindings.

## Review Notes
The guide is technically relevant and remains useful for existing CDKTF projects, but readers should treat CDKTF's deprecation as a significant adoption caveat for new infrastructure projects.
