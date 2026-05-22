# Validation Summary: How to Switch Between Workspaces with terraform workspace select

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform state and backends
- S3 backend state paths
- GitHub Actions
- Jenkins Pipeline
- Makefiles

## Sources Consulted
- Terraform `workspace select` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform CLI workspaces documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform state workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Help Center on selecting workspaces in automation: https://support.hashicorp.com/hc/en-us/articles/360043550953-Selecting-a-workspace-when-running-Terraform-in-automation
- HashiCorp `setup-terraform` GitHub Action: https://github.com/hashicorp/setup-terraform
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- Clarified the remote backend section. The original wording said switching workspaces triggers a remote state lookup and that Terraform downloads state immediately after switching. HashiCorp documents that Terraform stores the current workspace name locally and stores remote workspace state in backend-specific locations; state-aware commands then read the selected workspace's state from the backend. Updated the wording to say that after switching, the next command that needs state reads from the selected workspace's backend location.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was checked against current official HashiCorp documentation rather than local `terraform --help` output.
- The `-or-create` flag is current in the official `terraform workspace select` command reference.
- The S3 backend workspace path example matches the documented default `<workspace_key_prefix>/<workspace_name>/<key>` pattern, where the default prefix is `env:`.
