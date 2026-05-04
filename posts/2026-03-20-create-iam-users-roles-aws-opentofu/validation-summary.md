# Validation Summary: How to Create IAM Users and Roles with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL syntax, `for_each`, `flatten`, `jsonencode`)
- AWS IAM (users, groups, roles, policies, instance profiles)
- AWS Secrets Manager (referenced for storing access keys)
- AWS Security Token Service (`sts:AssumeRole`)
- AWS managed policies (`AmazonS3ReadOnlyAccess`, `ReadOnlyAccess`)
- AWS EC2 / Lambda service principals
- AWS IAM trust policy conditions (`aws:MultiFactorAuthPresent`, `BoolIfExists`)

## Sources Consulted
- AWS provider (Terraform Registry) `aws_iam_user`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user
- AWS provider `aws_iam_access_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_access_key
- AWS provider `aws_iam_group`, `aws_iam_group_policy_attachment`, `aws_iam_user_group_membership`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group
- AWS provider `aws_iam_role` and `aws_iam_instance_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- AWS provider `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- AWS IAM documentation on service principals (ec2.amazonaws.com, lambda.amazonaws.com): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM JSON policy reference (Version `2012-10-17`, `BoolIfExists`, `aws:MultiFactorAuthPresent`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- OpenTofu language docs for `for_each`, `flatten`, `jsonencode`: https://opentofu.org/docs/language/

## Issues Found
No technical issues found.

- All AWS provider resource names and argument names are correct (`aws_iam_user`, `aws_iam_access_key`, `aws_iam_group`, `aws_iam_group_policy_attachment`, `aws_iam_user_group_membership`, `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_iam_instance_profile`, `aws_secretsmanager_secret_version`).
- The exposed attributes on `aws_iam_access_key` (`id`, `secret`) are accurate.
- AWS managed policy ARNs (`arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess`, `arn:aws:iam::aws:policy/ReadOnlyAccess`) are valid.
- IAM trust policy structure (Version, Statement, Effect, Principal, Action, Condition) and the use of `BoolIfExists` with `aws:MultiFactorAuthPresent` follow AWS guidance for cross-account roles.
- Service principals `ec2.amazonaws.com` and `lambda.amazonaws.com` are correct.
- The `flatten` + `for_each` pattern used to attach multiple policies per role is a recognized OpenTofu/Terraform idiom and is syntactically valid.

## Review Notes
- The Secrets Manager snippet references `aws_secretsmanager_secret.developer_key.id` but the corresponding `aws_secretsmanager_secret` resource is not shown. This is a typical "snippet" omission rather than an error, but a reader copy-pasting the example would also need to declare that resource for the configuration to apply.
- The cross-account role uses `arn:aws:iam::<id>:root` as principal, which trusts the entire account; combined with `BoolIfExists` on `aws:MultiFactorAuthPresent`, MFA is required only when the caller's session reports an MFA value. This matches AWS-documented behavior, but readers should be aware that `BoolIfExists` is more permissive than `Bool` and is intentional for service-to-service callers.
- No version pinning is shown for the AWS provider; if behavior of any resource changes in a future major version of the provider, examples may need re-verification.
