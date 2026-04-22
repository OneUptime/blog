# Validation Summary: How to Configure S3 Backend with OIDC Authentication in OpenTofu - Auth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu S3 backend
- AWS IAM OIDC identity providers
- AWS STS `AssumeRoleWithWebIdentity`
- Amazon S3 remote state storage
- DynamoDB state locking
- GitHub Actions OIDC
- GitLab CI/CD OIDC ID tokens
- Terraform/OpenTofu HCL

## Sources Consulted
- OpenTofu official S3 backend documentation - https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu official Docker image guidance - https://opentofu.org/docs/intro/install/docker/
- AWS IAM User Guide: Create a role for OIDC federation / GitHub OIDC role conditions - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
- AWS CLI Command Reference: `sts assume-role-with-web-identity` - https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role-with-web-identity.html
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- `aws-actions/configure-aws-credentials` official README - https://github.com/aws-actions/configure-aws-credentials
- GitLab Docs: Configure OpenID Connect in AWS to retrieve temporary credentials - https://docs.gitlab.com/ci/cloud_services/aws/
- GitLab Docs: OpenID Connect authentication using ID tokens - https://docs.gitlab.com/ci/secrets/id_token_authentication/
- HashiCorp AWS provider documentation source: `aws_iam_openid_connect_provider` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_openid_connect_provider.html.markdown

## Issues Found
1. **GitHub OIDC provider thumbprints were outdated guidance**: The example hardcoded GitHub OIDC thumbprints. Current AWS/GitHub guidance no longer requires specifying the certificate thumbprint for GitHub's OIDC provider, and the AWS provider documents that AWS ignores configured thumbprints for recognized providers such as GitHub. **Fix:** Removed the `thumbprint_list` block from the `aws_iam_openid_connect_provider` example.
2. **Repository wildcard comment incorrectly claimed branch restriction**: The `repo:my-org/my-repo:*` subject condition restricts access to a repository, not to a specific branch. **Fix:** Updated the comment to say it restricts to a specific repository.
3. **DynamoDB lock permissions were incomplete**: OpenTofu's S3 backend documentation lists `dynamodb:DescribeTable` as required for DynamoDB state locking. **Fix:** Added `dynamodb:DescribeTable` to the DynamoDB permissions list.
4. **GitLab CI example used deprecated token and unsupported image pattern**: `CI_JOB_JWT_V2` is deprecated in GitLab and scheduled for removal, and current OpenTofu docs no longer support using `ghcr.io/opentofu/opentofu:latest` directly as a general-purpose CI image. **Fix:** Replaced the GitLab snippet with `id_tokens`, wrote the issued token to a file, and configured `AWS_ROLE_ARN`, `AWS_ROLE_SESSION_NAME`, and `AWS_WEB_IDENTITY_TOKEN_FILE` so OpenTofu can use web identity authentication directly.

## Review Notes
- The S3 backend block uses `dynamodb_table`, which remains supported by OpenTofu. OpenTofu currently also supports S3-native locking with `use_lockfile=true`, but DynamoDB locking is not deprecated.
- The examples assume the S3 bucket already exists and the DynamoDB lock table has a string partition key named `LockID`.
- The GitHub Actions example uses valid OIDC workflow permissions and a valid `aws-actions/configure-aws-credentials` configuration.
