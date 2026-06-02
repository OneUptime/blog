# Validation Summary: How to Set Up Terraform CI/CD with GitLab CI for AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM and STS
- Terraform CLI and Terraform AWS provider
- GitLab CI/CD
- GitLab OIDC ID tokens
- GitLab environments and protected environments
- GitLab-managed Terraform/OpenTofu state
- GitLab Terraform/OpenTofu merge request reports
- Slack webhook notifications

## Sources Consulted
- GitLab Docs: Configure OpenID Connect in AWS to retrieve temporary credentials - https://docs.gitlab.com/ci/cloud_services/aws/
- GitLab Docs: OpenID Connect (OIDC) authentication using ID tokens - https://docs.gitlab.com/ci/secrets/id_token_authentication/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: CI/CD artifacts reports types - https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab Docs: OpenTofu integration in merge requests - https://docs.gitlab.com/user/infrastructure/iac/mr_integration/
- GitLab Docs: GitLab-managed Terraform/OpenTofu state - https://docs.gitlab.com/user/infrastructure/iac/terraform_state/
- GitLab Docs: Troubleshooting the Terraform integration with GitLab - https://docs.gitlab.com/user/infrastructure/iac/troubleshooting/
- GitLab Docs: Protected environments - https://docs.gitlab.com/ci/environments/protected_environments/
- GitLab Docs: Resource groups - https://docs.gitlab.com/ci/resource_groups/
- HashiCorp Developer: terraform apply command reference - https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform AWS Provider: aws_iam_openid_connect_provider - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider

## Issues Found
- The AWS OIDC audience used `https://gitlab.com`. GitLab's current AWS OIDC guidance says AWS integrations should typically use an audience that represents the validating service, commonly `sts.amazonaws.com`, and the AWS IAM OIDC provider must match that audience. Updated the IAM provider `client_id_list`, IAM trust policy `gitlab.com:aud`, and GitLab `id_tokens` audience to `sts.amazonaws.com`.
- The IAM role trust policy restricted `gitlab.com:sub` to only the `main` branch while the guide's pipeline runs plan jobs on merge request pipelines. That exact subject would prevent MR plan jobs from assuming the role. Updated the example subject condition to allow project branches and added an inline note to tighten production access further, for example with separate roles.
- The `.aws_auth` template was defined but not used by the plan or apply jobs, so the jobs would install or run Terraform without exporting AWS credentials from OIDC. Added `extends: .aws_auth` to plan and apply jobs and moved AWS CLI installation into the shared auth template.
- The original OIDC shell command nested the AWS STS command inside `export $(printf ...)`, which makes failures harder to detect. Changed it to capture the STS output first and then export the credentials, matching GitLab's documented pattern.
- The protected environment navigation pointed to `Settings > CI/CD > Environments`. Current GitLab documentation describes protected environment configuration under `Settings > CI/CD > Protected environments`. Updated the text.
- The merge request report example wrote raw `terraform show -json` output as the `reports:terraform` artifact. GitLab's documented Terraform/OpenTofu report expects a summarized JSON object with create, update, and delete counts. Added `jq`, converted the plan JSON to GitLab's expected report shape, and changed the report path to the documented scalar form.

## Review Notes
- The example still attaches `AdministratorAccess` for brevity. It works technically, but production pipelines should use least-privilege IAM policies and often separate read-only plan and apply roles.
- The post uses `hashicorp/terraform:1.7.0`. The syntax shown remains valid, but teams starting fresh should consider pinning a newer Terraform patch release after testing provider compatibility.
