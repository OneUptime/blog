# Validation Summary: How to Use terraform fmt Check in CI Pipelines

## Status
validated

## Post Type
Tutorial / CI implementation guide

## Technologies Covered
- Terraform CLI
- `terraform fmt`
- GitHub Actions
- GitLab CI/CD
- pre-commit hooks
- TFLint
- Bash scripting

## Sources Consulted
- Terraform `fmt` command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terraform CLI source for `fmt` supported file extensions and exit codes: https://raw.githubusercontent.com/hashicorp/terraform/main/internal/command/fmt.go
- GitHub Actions workflow syntax and `permissions`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- `actions/github-script` usage examples: https://github.com/actions/github-script
- GitLab CI `rules` documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab CI YAML syntax reference for `rules:changes`: https://docs.gitlab.com/ci/yaml/
- `pre-commit-terraform` project documentation: https://github.com/antonbabenko/pre-commit-terraform
- TFLint and `setup-tflint` documentation: https://github.com/terraform-linters/tflint and https://github.com/terraform-linters/setup-tflint

## Issues Found
- The post documented `terraform fmt -check` as specifically returning exit code `3` when files need formatting. Terraform's public CLI documentation only guarantees a non-zero exit status for unformatted input, so the wording was changed to "non-zero exit code."
- The GitHub Actions comment step called `github.rest.issues.createComment` without `await`. The `actions/github-script` examples await REST API calls, so the snippet was updated to `await github.rest.issues.createComment(...)`.
- The GitHub Actions workflow posted a PR comment but did not grant the `GITHUB_TOKEN` permission needed to add an issue/PR comment in repositories with restricted default permissions. Added `contents: read` and `issues: write` under the job permissions.
- The generated-file exclusion example piped `terraform fmt` output through `grep`, which filters displayed output but does not exclude files from the formatting check and can produce misleading pipeline exit behavior. Replaced it with a `find ... -exec terraform fmt -check -diff {} +` example that excludes the generated and `.terraform` paths before invoking Terraform.
- The `.tfvars` section incorrectly said Terraform does not check `.tfvars` files by default before immediately correcting itself. Updated the section to state directly that `terraform fmt` handles `.tf` and `.tfvars` files, and noted that JSON variants are not modified.
- The TFLint setup action example used `terraform-linters/setup-tflint@v4`; the official current usage example uses `@v6`, so the workflow snippet was updated.

## Review Notes
- Terraform 1.7.0 is used as an example pinned version. It is not the latest Terraform release as of this review date, but pinning a specific version in CI remains technically sound.
- The auto-fix GitHub Actions example is intentionally partial. In a real workflow it would also need appropriate repository write permissions and care around forked pull requests.
