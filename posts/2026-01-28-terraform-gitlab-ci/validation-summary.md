# Validation Summary: How to Run Terraform with GitLab CI

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GitLab CI/CD
- Terraform CLI
- Terraform HTTP and S3 backends
- GitLab-managed Terraform/OpenTofu state
- GitLab Terraform/OpenTofu merge request reports
- AWS STS and GitLab OIDC
- tfsec
- Checkov
- Infracost
- GitLab Terraform Module Registry

## Sources Consulted
- GitLab CI/CD artifacts report types: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab OpenTofu/Terraform merge request integration: https://docs.gitlab.com/user/infrastructure/iac/mr_integration/
- GitLab-managed Terraform/OpenTofu state: https://docs.gitlab.com/user/infrastructure/iac/terraform_state/
- GitLab AWS OIDC authentication: https://docs.gitlab.com/ci/cloud_services/aws/
- GitLab Terraform Module Registry: https://docs.gitlab.com/user/packages/terraform_module_registry/
- Terraform `plan` command: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform HTTP backend: https://developer.hashicorp.com/terraform/language/backend/http
- Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform workspace select command: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- AWS CLI `sts assume-role-with-web-identity`: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role-with-web-identity.html

## Issues Found
- The merge request Terraform report pointed `artifacts:reports:terraform` at the binary `tfplan` file. GitLab expects a JSON report file, so the snippet now generates `tfplan.json` with `terraform show -json` and `jq`, then uses that JSON report artifact.
- The post said GitLab displays the plan diff directly in merge requests. GitLab's Terraform/OpenTofu report widget displays a plan summary, so the wording now says "plan summary."
- The external backend paragraph named both S3 and GCS, but the snippet used S3-specific backend keys (`bucket`, `key`, and `region`). The text now describes the example as S3.
- The static AWS credential example re-declared `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as self-referential CI variables. Those lines were removed; credentials should be supplied as GitLab CI/CD variables or replaced with OIDC.
- The AWS OIDC example was updated to use a documented `assume-role-with-web-identity` flow with a captured STS response and `--duration-seconds`.
- The `tfsec` example attached native tfsec JSON as `artifacts:reports:sast`, but GitLab SAST reports must use GitLab's supported report schema. The snippet now stores the tfsec JSON as a regular artifact path.
- The drift detection example used `CI_JOB_STATUS == failed`, which would alert for Terraform errors as well as drift. The script now checks Terraform's `-detailed-exitcode` result and alerts only on exit code `2`.
- The complete pipeline generated a full Terraform plan JSON for the GitLab report. GitLab's documented manual report example reduces the plan to create/update/delete counts, so the snippet now does that conversion with `jq`.
- The destroy job set `GIT_STRATEGY: none` while still extending a `before_script` that changes into the Terraform configuration directory and runs `terraform init`. That would remove the checked-out configuration needed by Terraform, so the override was removed.

## Review Notes
- Terraform was not installed in the local environment, so CLI validation was performed against official HashiCorp command documentation instead of local `terraform --help` output.
- The examples still use Terraform 1.7 as shown in the original article. The reviewed commands and options remain valid in current Terraform documentation, but teams may want to pin a newer Terraform patch or minor version in real pipelines.
