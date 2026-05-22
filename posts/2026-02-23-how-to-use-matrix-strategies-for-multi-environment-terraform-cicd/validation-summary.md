# Validation Summary: How to Use Matrix Strategies for Multi-Environment Terraform CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- GitHub Actions matrix strategies
- GitHub Actions artifacts, job outputs, environments, and permissions
- AWS credential configuration for GitHub Actions
- GitLab CI `parallel:matrix`
- JSON and `jq` for dynamic matrix generation

## Sources Consulted
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions expressions documentation for `fromJSON`: https://docs.github.com/actions/reference/workflows-and-actions/expressions
- AWS `configure-aws-credentials` action documentation: https://github.com/aws-actions/configure-aws-credentials
- `actions/github-script` documentation: https://github.com/actions/github-script
- Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI configuration and provider plugin cache documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- GitLab CI/CD YAML syntax documentation: https://docs.gitlab.com/ci/yaml/
- GitLab CI matrix expressions documentation: https://docs.gitlab.com/ci/yaml/matrix_expressions/
- GitLab CI parallel matrix artifact dependency documentation: https://docs.gitlab.com/ci/jobs/job_control/

## Issues Found
- Some GitHub Actions job snippets omitted `runs-on`, which is required for normal jobs that run steps. Added `runs-on: ubuntu-latest` to the affected `deploy` examples.
- The AWS role-assumption examples used `role-to-assume` without granting GitHub's OIDC token permission. Added `permissions: id-token: write` and `contents: read` where the examples configure AWS credentials via OIDC.
- The sequential GitHub Actions and GitLab examples passed `-auto-approve` while also passing a saved plan file to `terraform apply`. Terraform applies saved plans without prompting, and the `-auto-approve` option is ignored in that mode, so the redundant flag was removed.
- The GitLab apply job depended on a parallel matrix job by the base job name, which can download artifacts from all parallel jobs and cause overwrite or mismatch problems. Replaced it with `needs:parallel:matrix` so each apply job consumes the matching plan job artifact.

## Review Notes
- The examples intentionally use Terraform `1.7.0`; the CLI flags shown remain valid, but readers should pin to a Terraform version supported by their organization.
- The `actions/github-script` failure-reporting example is syntactically consistent with v7 and `github.rest.*`, but a complete workflow must also grant `issues: write` permission if the default `GITHUB_TOKEN` permissions are restricted.
- The related OneUptime blog URL returned HTTP 200 during validation.
