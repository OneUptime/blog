# Validation Summary: How to Debug Terraform CI/CD Pipeline Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Terraform CLI
- Terraform provider logging
- Terraform state locking
- Terraform dependency lock files
- GitHub Actions workflows
- AWS IAM/OIDC authentication
- Shell scripting and JSON reporting with jq

## Sources Consulted
- Terraform debug logging documentation: https://developer.hashicorp.com/terraform/internals/debugging
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform `force-unlock` command reference: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform `providers lock` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform refresh-only documentation: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform `version` command reference: https://developer.hashicorp.com/terraform/cli/commands/version
- Terraform apply and saved plan documentation: https://developer.hashicorp.com/terraform/tutorials/cli/apply
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/automating-your-workflow-with-github-actions/workflow-syntax-for-github-actions
- GitHub Actions OIDC with AWS documentation: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- GitHub Actions artifact upload documentation: https://github.com/actions/upload-artifact
- AWS CLI `sts get-caller-identity` reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- AWS SDKs and Tools environment variables documentation: https://docs.aws.amazon.com/sdkref/latest/guide/environment-variables.html
- AWS IAM OIDC federation documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc.html
- Referenced OneUptime monitoring link: https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pipeline-monitoring/view

## Issues Found
- The provider logging example included `TF_LOG_PROVIDER_AWS`, but Terraform documents `TF_LOG`, `TF_LOG_CORE`, `TF_LOG_PROVIDER`, and `TF_LOG_PATH` rather than per-provider logging variables. Replaced it with `TF_LOG_CORE: WARN` as an optional way to reduce Terraform core log noise while provider logs remain enabled.
- The lock-file hash mismatch snippet ran `terraform init` before `terraform providers lock`. If the provider lock file is missing the CI platform checksum, `init` can fail before the lock file is repaired. Changed the snippet to run `terraform providers lock -platform=linux_amd64 -platform=darwin_arm64` before retrying `terraform init`.
- The saved-plan apply command placed `-no-color` after the `tfplan` positional argument. Moved options before the saved plan file so the command matches Terraform's documented `terraform apply [options] [plan file]` usage.
- The failure report snippet built JSON with a heredoc and raw shell interpolation. Multi-line errors or quotes from Terraform output could produce invalid JSON. Replaced it with `jq -n` and typed arguments so strings are escaped correctly and `provider_versions` / `resource_count` remain structured JSON values.

## Review Notes
- Terraform was not installed in the workspace, so local CLI `--help` checks were not available. Commands and flags were verified against official Terraform CLI documentation instead.
- The examples assume a Linux GitHub Actions runner with common tools such as `grep -P`, `jq`, `curl`, `nslookup`, and the AWS CLI available.
