# Validation Summary: How to Use Secrets in GitHub Actions Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- GitHub Actions secrets
- GitHub Actions environments
- GitHub Actions reusable workflows
- GitHub Actions `GITHUB_TOKEN` permissions
- GitHub CLI (`gh secret`, `gh run`)
- OpenID Connect for cloud deployments
- Docker Hub login action
- AWS credentials action

## Sources Consulted
- GitHub Docs: Using secrets in GitHub Actions - https://docs.github.com/actions/security-guides/using-secrets-in-github-actions
- GitHub Docs: GitHub Actions contexts - https://docs.github.com/actions/learn-github-actions/contexts
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Reusing workflows - https://docs.github.com/actions/how-tos/sharing-automations/reusing-workflows
- GitHub Docs: Automatic token authentication - https://docs.github.com/actions/security-guides/automatic-token-authentication
- GitHub Docs: OpenID Connect in AWS - https://docs.github.com/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- GitHub CLI manual: `gh secret set` - https://cli.github.com/manual/gh_secret_set
- GitHub CLI manual: `gh secret list` - https://cli.github.com/manual/gh_secret_list
- GitHub CLI manual: `gh run list` - https://cli.github.com/manual/gh_run_list
- Docker login action README - https://github.com/docker/login-action
- AWS configure credentials action README - https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- Clarified that `GITHUB_TOKEN` is available to workflow jobs, matching GitHub's documentation that each job receives an automatically generated token.
- Corrected the self-hosted runner guidance to avoid implying that runners belong to GitHub Actions environments. Environments gate jobs and provide environment secrets; runner labels select eligible self-hosted runners.
- Updated the audit example caption because `gh run list --workflow=deploy.yml` lists workflow runs but does not prove that secrets were used in those runs.
- Expanded the documented secret count limit to include both repository secrets and environment secrets.
- Fixed the large-file base64 example by replacing the non-portable `base64 -i` usage with stdin redirection and using `printf` during decode to avoid adding an extra newline.

## Review Notes
The examples use pinned major versions such as `actions/checkout@v4`, `docker/login-action@v3`, `aws-actions/configure-aws-credentials@v4`, and `actions/github-script@v7`. These are valid examples, though future maintenance should periodically check whether newer major versions are preferred by each action.
