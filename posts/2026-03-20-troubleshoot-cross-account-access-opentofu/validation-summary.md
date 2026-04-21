# Validation Summary: How to Troubleshoot Cross-Account Access Issues in OpenTofu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTofu
- Terraform/OpenTofu AWS provider
- AWS IAM roles and trust policies
- AWS STS AssumeRole
- AWS CLI
- Amazon S3 bucket policies and OpenTofu S3 backend state

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/v1.9/language/settings/backends/s3/
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- HashiCorp AWS provider assume_role documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS IAM role trust policy documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-trust-policy.html
- AWS IAM Principal element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM global condition key documentation for aws:PrincipalArn: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS STS AssumeRole API documentation: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS STS session tags documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- AWS CLI sts assume-role command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS CLI iam simulate-principal-policy command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- AWS CLI iam get-role command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/get-role.html

## Issues Found
- The provider example passed STS session tags, but the target trust policy and source permission checks only covered `sts:AssumeRole`. AWS requires `sts:TagSession` when session tags are passed. Updated the trust policy examples, the manual `aws sts assume-role` test, the policy simulator action list, and the summary to include `sts:TagSession` where session tagging is used.
- The S3 state bucket section said the bucket policy must allow the provider-assumed role. OpenTofu backend access is configured separately from provider aliases, so the bucket policy must allow the identity used by the S3 backend, or the role configured in the backend's own `assume_role`. Updated the explanation, example principal, and summary.
- The trust policy condition used `StringEquals` for `aws:PrincipalArn`. AWS recommends ARN operators for ARN comparisons. Updated the condition to `ArnEquals`.

## Review Notes
- AWS CLI was not installed in the local environment, so CLI syntax was verified against official AWS CLI documentation rather than local `--help` output.
