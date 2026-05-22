# Validation Summary: How to Implement IAM Policy Best Practices with Terraform

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS IAM policies, roles, trust policies, and permissions boundaries
- Amazon S3 IAM permissions
- Amazon ECS task IAM roles
- AWS MFA condition keys

## Sources Consulted
- AWS IAM security best practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- AWS IAM permissions boundaries: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS IAM global condition context keys, including `aws:MultiFactorAuthPresent`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- Amazon ECS task IAM role trust policy guidance: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- Amazon S3 IAM action/resource mapping: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html
- Terraform AWS provider `aws_iam_policy` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy
- Terraform AWS provider `aws_iam_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS provider `aws_iam_role_policy_attachment` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- Terraform AWS provider `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- HashiCorp Terraform IAM policy tutorial: https://developer.hashicorp.com/terraform/tutorials/aws/aws-iam-policy

## Issues Found
- The ECS task role example referenced `data.aws_caller_identity.current.account_id` without showing the `aws_caller_identity` data source. Added `data "aws_caller_identity" "current" {}` before the role example so the snippet includes the referenced data source.
- The summary said the Terraform state file becomes an audit trail for who has access to what. Terraform state records managed infrastructure objects and their attributes, but it is not an access audit trail. Updated the sentence to say state records the IAM resources Terraform manages.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The HCL snippets were reviewed manually against the current Terraform AWS provider documentation.
- The MFA deny example uses AWS's documented `Deny` plus `BoolIfExists` plus `false` pattern, which also denies long-term access key requests that cannot include MFA context. This is appropriate for strict enforcement but can break scripts that rely on access keys.
- The permission boundary explanation is accurate for identity-based permissions. Resource-based policies can have additional nuances depending on whether they grant to a role ARN, role session ARN, or user ARN.
