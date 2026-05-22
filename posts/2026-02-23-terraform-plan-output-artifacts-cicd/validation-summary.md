# Validation Summary: How to Use Terraform Plan Output Artifacts in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform saved plan files and JSON plan output
- GitHub Actions artifacts and environments
- GitLab CI artifacts and manual jobs
- Infracost CLI
- Bash, jq, and sha256sum

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format reference: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform saved plan tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- Terraform sensitive data guidance: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub `actions/upload-artifact` documentation: https://github.com/actions/upload-artifact
- GitHub Actions deployment environments documentation: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments
- GitLab CI/CD YAML reference: https://docs.gitlab.com/ci/yaml/
- GitLab job artifacts documentation: https://docs.gitlab.com/ci/jobs/job_artifacts/
- Infracost CLI documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost CI/CD troubleshooting documentation: https://www.infracost.io/docs/troubleshooting/
- Infracost Plan JSON API documentation: https://www.infracost.io/docs/integrations/infracost_api/
- Referenced OneUptime post link: https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pull-request-workflows/view

## Issues Found
- GitHub Actions `actions/upload-artifact@v4` excludes hidden files by default, so `.terraform.lock.hcl` would not be uploaded as shown. Added `include-hidden-files: true` to the upload step.
- The saved-plan apply examples used `terraform apply -auto-approve tfplan`. Terraform accepts this, but `-auto-approve` is ignored when a saved plan file is passed because passing the file is already treated as approval. Changed the examples to `terraform apply tfplan`.
- The GitLab CI artifact list included `.terraform/`, which is unnecessary when the apply job runs `terraform init` and can contain sensitive backend or provider data. Removed `.terraform/` from the artifact list while keeping `.terraform.lock.hcl`.
- The plan-age example relied on `stat -c %Y tfplan`, which checks the downloaded file's filesystem modification time rather than a reliable plan creation timestamp. Added `tfplan.created_at` generation during the plan stage, included it in artifacts, and updated the check to read that timestamp.

## Review Notes
Terraform plan and JSON plan files can contain sensitive values, including values redacted in terminal output, so the post's short retention and cleanup guidance is important. Infracost currently supports plan JSON input for `infracost breakdown`, though its newer documentation also emphasizes direct source scanning for many workflows. The referenced OneUptime post link resolves successfully.
