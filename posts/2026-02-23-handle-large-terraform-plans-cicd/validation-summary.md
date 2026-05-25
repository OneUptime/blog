# Validation Summary: How to Handle Large Terraform Plans in CI/CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform S3 backend and remote state
- GitHub Actions workflows
- GitHub REST API issue comments
- GitHub Actions artifacts

## Sources Consulted
- Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub REST API issue comments documentation: https://docs.github.com/en/rest/issues/comments
- GitHub Actions upload-artifact repository documentation: https://github.com/actions/upload-artifact
- HashiCorp setup-terraform action repository documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The S3 backend example used `dynamodb_table` for locking. Terraform's S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfiles with `use_lockfile = true`, so the example was updated.
- The targeted plan section presented `-target` as a normal development workflow. Terraform documents `-target` as an exceptional-circumstances option and recommends splitting large configurations instead, so the guidance was narrowed to ad hoc recovery/workaround use.
- The parallelism section said Terraform refresh API calls are sequential by default. Terraform's `-parallelism` option defaults to 10 concurrent operations, so the explanation was corrected.
- The refresh-only section said it was faster and that Terraform does not calculate changes. Terraform documents refresh-only mode as planning state and root output updates, so the wording and command comment were corrected.

## Review Notes
The GitHub Actions matrix, timeout settings, `actions/github-script@v7`, `actions/upload-artifact@v4`, and Terraform command flags are consistent with current documentation. The exact best value for `-parallelism` depends on provider APIs, account quotas, and graph shape, so teams should tune it empirically.
