# Validation Summary: How to Set Up Terraform Access Controls for Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform S3 backend
- AWS IAM
- Amazon S3
- GitHub CODEOWNERS
- GitHub Actions
- GitHub Actions OIDC for AWS
- HCP Terraform / Terraform Enterprise team access
- AWS CLI
- jq

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- HashiCorp Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform Enterprise workspace access documentation: https://developer.hashicorp.com/terraform/enterprise/workspaces/settings/access
- HashiCorp TFE provider `tfe_team_access` documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions OIDC with AWS documentation: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS IAM OIDC role documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
- AWS action `configure-aws-credentials` documentation: https://github.com/aws-actions/configure-aws-credentials
- AWS CLI `s3api get-bucket-policy`, `iam list-roles`, `iam list-attached-role-policies`, and `iam list-role-policies` command references: https://docs.aws.amazon.com/cli/latest/reference/
- jq manual: https://jqlang.org/manual/

## Issues Found
- The S3 state bucket policy omitted `s3:ListBucket`, which Terraform's S3 backend requires on the bucket. Added scoped list permissions for platform, networking, and CI/CD principals.
- The S3 backend example used a DynamoDB lock table even though DynamoDB-based locking for the S3 backend is deprecated in current Terraform. Replaced it with an S3-native `use_lockfile = true` backend example.
- The S3 state policy did not include the lock-file permissions required when `use_lockfile` is enabled. Added `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` permissions for `.tflock` objects.
- The GitHub Actions workflow used OIDC, but the IAM trust policies used `sts:AssumeRole` with AWS principals. Updated the trust policies to use a GitHub OIDC federated principal and `sts:AssumeRoleWithWebIdentity`.
- The per-team IAM role trust condition used `aws:RequestTag/Team`, but the workflow did not pass session tags and GitHub OIDC trust policies should be constrained with token claims. Replaced it with `token.actions.githubusercontent.com:aud` and `token.actions.githubusercontent.com:sub` conditions.
- The Terraform planner role attached only AWS `ReadOnlyAccess`; with S3 lockfiles, `terraform plan` can still need state-backend write/delete permissions for lock management. Added a scoped state-backend policy for S3 state and lock-file access.

## Review Notes
- The examples are illustrative and still use placeholder account IDs, organization names, repository names, and state bucket names that must be replaced before use.
- For GitHub Actions, the apply-role OIDC subject now assumes a protected GitHub environment named `production`; teams should keep matching GitHub environment protection rules in place.
