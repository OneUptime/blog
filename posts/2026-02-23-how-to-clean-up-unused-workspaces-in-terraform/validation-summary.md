# Validation Summary: How to Clean Up Unused Workspaces in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform state commands
- Terraform S3 backend
- AWS CLI S3 API
- Bash scripting
- GitHub Actions
- Slack incoming webhooks
- Terraform HCL variable validation

## Sources Consulted
- HashiCorp Terraform CLI workspaces documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp `terraform workspace delete` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/delete
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform `timeadd` function reference: https://developer.hashicorp.com/terraform/language/functions/timeadd
- AWS CLI `s3api list-objects-v2` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-objects-v2.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow dispatch input documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow

## Issues Found
- The workspace state script was presented as showing last modification time, but `terraform state pull` does not expose a backend object's last-modified timestamp. Changed the heading and script labels to describe the actual output: resource count and state serial.
- The S3 state age script defined `KEY_SUFFIX` but did not use it. Updated the AWS CLI JMESPath queries to filter by the configured state key suffix instead of any key containing `terraform.tfstate`.
- The automated cleanup script used a pipeline into `while read`, which runs the loop in a subshell in Bash and prevents `CLEANUP_COUNT` and `ACTIVE_COUNT` from being reflected in the final summary. Changed it to process substitution.
- The GitHub Actions cleanup step used `inputs.dry_run` directly even though scheduled runs do not provide manual dispatch inputs. Updated the expression to use the input only for `workflow_dispatch` runs and default scheduled runs to dry-run mode.
- The Slack notification built JSON by interpolating raw command output into a JSON string, which can break on quotes or backslashes. Changed it to construct the payload with `jq`.
- The backend cleanup section implied S3 state files normally remain after `terraform workspace delete`. HashiCorp documents S3 workspace state deletion support and required delete permissions, so the wording now limits this cleanup to orphaned objects from manual changes or failed cleanup runs.
- The S3 orphan check used a regular-expression `grep` match for workspace names. Changed it to `grep -Fxq` so workspace names are matched literally and exactly.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
- Bash snippets were extracted from the post and checked with `bash -n`; no shell syntax errors were found after the fixes.
