# Validation Summary: How to Set Up Terraform CI/CD with GitHub Actions for AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM and OIDC federation
- Terraform CLI
- Terraform S3 backend state locking
- GitHub Actions workflows, permissions, environments, concurrency, caching, and expressions
- HashiCorp setup-terraform GitHub Action
- AWS configure-aws-credentials GitHub Action
- Slack GitHub Action

## Sources Consulted
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS configure-aws-credentials action README - https://github.com/aws-actions/configure-aws-credentials
- HashiCorp setup-terraform action README - https://github.com/hashicorp/setup-terraform
- Terraform S3 backend documentation - https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform CLI plan command documentation - https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI apply command documentation - https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI fmt command documentation - https://developer.hashicorp.com/terraform/cli/commands/fmt
- GitHub Actions workflow syntax documentation - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions expressions documentation - https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Actions deployments and environments documentation - https://docs.github.com/en/actions/reference/deployments-and-environments
- Terraform AWS provider aws_iam_openid_connect_provider documentation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Slack GitHub Action documentation - https://docs.slack.dev/tools/slack-github-action/

## Issues Found
- The OIDC provider example used a hard-coded GitHub certificate thumbprint. The current AWS provider documentation says `thumbprint_list` is optional, and AWS ignores configured thumbprints for GitHub because it uses trusted root CAs. Removed the hard-coded thumbprint to avoid stale certificate guidance.
- The workflow examples pinned older action major versions and Terraform 1.7.0. Updated `aws-actions/configure-aws-credentials` to `@v6`, `hashicorp/setup-terraform` to `@v4`, and the Terraform version to `1.14.6` to match current official examples.
- The PR comment script interpolated raw Terraform plan output directly into JavaScript. Moved the output through an environment variable and built the Markdown body with an array join so plan text cannot break the script template literal.
- The plan comment labeled `steps.plan.outcome` as an exit code. Changed it to `steps.plan.outputs.exitcode`, which is the actual output exposed by the setup-terraform wrapper.
- The GitHub API comment calls did not use `await`. Added `await` in the `github-script` snippets to match the async API usage.
- The state locking section recommended DynamoDB locking. Current Terraform S3 backend documentation marks DynamoDB-based locking as deprecated, so the guidance now recommends S3 lockfiles with `use_lockfile = true`.
- The concurrency snippet used `matrix.environment` as if it could be added anywhere in a workflow. GitHub only allows `matrix` in job-level concurrency, so the text now says to add it to matrix-based Terraform jobs.
- The concurrency snippet only used `cancel-in-progress: false`. Current GitHub Actions docs note that only one pending run is kept by default, so `queue: max` was added to queue pending runs instead of replacing them.
- The cache key nested a `${{ matrix.environment }}` expression inside a string passed to `hashFiles`, which GitHub expressions do not evaluate. Replaced it with `format('environments/{0}/.terraform.lock.hcl', matrix.environment)`.
- The Slack notification snippet used the older `slackapi/slack-github-action@v1` environment variable style. Updated it to `@v3.0.3` with `webhook` and `webhook-type: incoming-webhook`.
- The Slack notification snippet referenced `matrix.environment`, but the apply workflow uses separate jobs rather than a matrix. Replaced that reference with `github.job`.

## Review Notes
The tutorial is technically relevant and the remaining commands and configuration patterns are valid. A future improvement would be to use least-privilege IAM policies instead of `AdministratorAccess`; the post already warns about separate plan/apply roles, so this was left as an example-scope security caveat rather than a correctness error.
