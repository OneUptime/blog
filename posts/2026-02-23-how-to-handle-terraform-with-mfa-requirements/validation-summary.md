# Validation Summary: How to Handle Terraform with MFA Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform S3 backend
- AWS IAM
- AWS STS
- AWS MFA
- AWS shared configuration profiles
- aws-vault
- GitHub Actions OIDC

## Sources Consulted
- AWS IAM secure API access with MFA documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_configure-api-require.html
- AWS IAM global condition context keys documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS CLI `sts assume-role` command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS SDKs and Tools assume role credential provider documentation: https://docs.aws.amazon.com/sdkref/latest/guide/feature-assume-role-credentials.html
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider `aws_iam_openid_connect_provider` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider.html
- GitHub Actions OIDC with AWS documentation: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS configure-aws-credentials GitHub Action documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The GitHub Actions OIDC provider example configured a hard-coded `thumbprint_list`. Current AWS and Terraform provider guidance says thumbprints are not needed for GitHub's OIDC provider and are ignored for verification, so the example was updated to omit `thumbprint_list`.
- The S3 backend example used `dynamodb_table` for state locking. Terraform currently documents DynamoDB-based S3 backend locking as deprecated, so the example was updated to use `use_lockfile = true`.
- The S3 backend example used top-level `role_arn`. Terraform's current S3 backend documentation uses the `assume_role` configuration block, so the example was updated to `assume_role = { role_arn = "..." }`.

## Review Notes
- The MFA/STS explanation is consistent with AWS documentation: MFA-protected API access requires temporary credentials from `AssumeRole` or `GetSessionToken`, and `mfa_serial` is the shared config setting used when assuming a role that requires MFA.
- For role-based Terraform workflows, MFA should be enforced in the role trust policy. Once the role is assumed, the role's own permissions policy should grant the required Terraform permissions.
- The CI/CD examples are directionally correct, but real production policies should avoid relying only on source IP restrictions for hosted runners with broad or changing IP ranges.
