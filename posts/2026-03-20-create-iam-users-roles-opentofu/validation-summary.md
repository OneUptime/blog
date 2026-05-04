# Validation Summary: How to Create IAM Users and Roles with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS IAM (Users, Groups, Roles, Policies, Access Keys)
- HCL (HashiCorp Configuration Language)
- AWS STS (sts:AssumeRole)
- AWS Lambda (as a role principal example)

## Sources Consulted
- AWS provider documentation for `aws_iam_user`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user
- AWS provider documentation for `aws_iam_access_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_access_key
- AWS provider documentation for `aws_iam_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group
- AWS provider documentation for `aws_iam_group_membership`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_membership
- AWS provider documentation for `aws_iam_group_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_policy_attachment
- AWS provider documentation for `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider documentation for `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- AWS IAM JSON policy reference (Version, Statement, Effect, Principal, Action, Condition): https://docs.aws.amazon.com/IAM/UserGuide/reference_policies.html
- AWS IAM condition keys (`aws:MultiFactorAuthPresent`): https://docs.aws.amazon.com/IAM/UserGuide/reference_policies_condition-keys.html
- AWS managed policies: `ReadOnlyAccess` and `service-role/AWSLambdaBasicExecutionRole` ARNs verified.

## Issues Found
No technical issues found.

- `aws_iam_user` attributes (`name`, `path`, `force_destroy`, `tags`) are all valid.
- `aws_iam_access_key` correctly references the user by name; the `id` and `secret` attribute exports are valid.
- `aws_iam_group_membership` is a valid resource (note: it manages membership exclusively).
- `aws_iam_group_policy_attachment` and `aws_iam_role_policy_attachment` use correct argument names (`group`/`role`, `policy_arn`).
- `assume_role_policy` JSON structure (using `jsonencode`) follows the IAM trust policy schema with the correct policy version `2012-10-17`.
- The cross-account role uses a valid `Bool` condition operator with the `aws:MultiFactorAuthPresent` key.
- Both AWS managed policy ARNs (`arn:aws:iam::aws:policy/ReadOnlyAccess` and `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`) are correct.

## Review Notes
- `aws_iam_group_membership` manages group membership exclusively (it will remove any users not listed). For multi-source membership, consider `aws_iam_user_group_membership`. The post's usage is fine, but readers should be aware of this behavior.
- Storing `aws_iam_access_key` secrets in Terraform/OpenTofu state is unavoidable when using this resource — readers should treat state files as sensitive.
- Long-lived IAM users with static access keys are generally discouraged in favor of IAM Identity Center (SSO) or IAM Roles Anywhere; the post's scope is correct as a primer but a future enhancement could mention these alternatives.
- The managed policy `ReadOnlyAccess` is broad; in practice, scoped customer-managed policies are preferred.
