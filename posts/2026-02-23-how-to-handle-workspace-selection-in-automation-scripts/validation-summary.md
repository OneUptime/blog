# Validation Summary: How to Handle Workspace Selection in Automation Scripts

## Status
validated

## Post Type
Tutorial / DevOps automation guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform CLI environment variables
- Bash scripting
- GitHub Actions
- GitLab CI/CD
- Jenkins Declarative Pipeline

## Sources Consulted
- HashiCorp Terraform CLI `workspace select` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- HashiCorp Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform CLI `workspace new` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- HashiCorp Terraform CLI `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Help Center, selecting a workspace in automation: https://support.hashicorp.com/hc/en-us/articles/360043550953-Selecting-a-workspace-when-running-Terraform-in-automation
- HashiCorp `setup-terraform` GitHub Action README: https://github.com/hashicorp/setup-terraform
- GitHub Actions deployments and environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- Jenkins Declarative Pipeline syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/

## Issues Found
- Replaced workspace existence checks based on `terraform workspace list | grep` with `terraform workspace select -or-create`, because the official Terraform CLI supports `-or-create` for this exact select-or-create workflow and the grep version could miss the active workspace marker or be affected by regex matching.
- Unset `TF_WORKSPACE` before explicit workspace selection in setup, safety, Jenkins, GitLab, and wrapper examples. Terraform documents `TF_WORKSPACE` as overriding workspace selection, so leaving it set while running explicit selection commands can make automation target the wrong workspace or fail unexpectedly.
- Updated the GitHub Actions example from `hashicorp/setup-terraform@v3` with Terraform `1.7.0` to the current documented `hashicorp/setup-terraform@v4` example style with Terraform `1.14.6`.
- Changed the GitHub Actions production approval comment to say production can require approval through environment protection rules. The workflow's `environment` key can trigger GitHub environment protections, but the YAML alone does not create a manual approval gate.
- Changed GitLab artifact paths from `${TF_ROOT}/dev.tfplan` and `${TF_ROOT}/prod.tfplan` to `terraform/dev.tfplan` and `terraform/prod.tfplan`, because GitLab artifact paths are relative to `$CI_PROJECT_DIR`.
- Renamed the Jenkins parameter from `WORKSPACE` to `TARGET_WORKSPACE` to avoid colliding with Jenkins' built-in workspace environment variable.
- Fixed the Terraform wrapper script so it validates argument count before calling `shift`; with `set -e`, shifting before validation can terminate the script before the usage message is printed.

## Review Notes
- Bash snippets were extracted and checked with `bash -n`.
- YAML snippets were extracted and parsed successfully.
- Terraform was not installed locally in the review environment, so Terraform command behavior was verified against official HashiCorp documentation instead of local `terraform --help` output.
