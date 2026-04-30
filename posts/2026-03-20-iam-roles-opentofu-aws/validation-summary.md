# Validation Summary: IAM Roles with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS IAM
- AWS STS
- Amazon EC2
- AWS Lambda
- OpenTofu
- HCL
- AWS provider for OpenTofu/Terraform

## Sources Consulted
- AWS IAM roles: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html
- AWS temporary security credentials: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp.html
- AWS JSON policy `Principal` element: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS confused deputy guidance and external IDs: https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html
- AWS permissions boundaries: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS role maximum session duration: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-settings.html
- AWS managed policy `AWSLambdaBasicExecutionRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaBasicExecutionRole.html
- AWS managed policies for Amazon S3, including `AmazonS3ReadOnlyAccess`: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-iam-awsmanpol.html
- AWS tags for IAM resources: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html
- Terraform Registry `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform Registry `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- Terraform Registry `aws_iam_instance_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- Terraform Registry `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The introduction said IAM roles "issue temporary security tokens." I changed this to say that assuming a role provides temporary security credentials, which matches AWS IAM and STS terminology more closely.
- The cross-account trust policy used a literal placeholder ARN fragment, `TRUSTED-ACCOUNT-ID`, which was not directly runnable. I changed it to `var.trusted_account_id` and renamed the role from `cross-account-read-role` to `cross-account-role` so the example no longer implies read permissions that are not actually granted in the snippet.
- The best-practice guidance for external IDs was too broad. I narrowed it to third-party cross-account roles, which is the documented confused-deputy use case in AWS IAM.
- The tagging best-practice bullet claimed IAM role tags are for cost allocation and auditing. I changed this to organization, access control, and auditing, which reflects the general IAM tagging guidance.

## Review Notes
- The permission boundary example is technically correct, but it assumes `data.aws_iam_policy_document.assume` and `aws_iam_policy.boundary` are defined elsewhere in the configuration.
