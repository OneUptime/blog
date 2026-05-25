# Validation Summary: How to Attach Multiple Policies to IAM Role in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS IAM roles
- AWS managed policies
- AWS inline policies
- Terraform `for_each`, sets, maps, and modules

## Sources Consulted
- Terraform AWS Provider `aws_iam_role_policy_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- Terraform AWS Provider `aws_iam_role` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider `aws_iam_role_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- AWS IAM and AWS STS quotas: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- AWS IAM managed policies and inline policies: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html
- AWS IAM create a role to delegate permissions to an AWS service: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html

## Issues Found
- The post description mentioned `count`, but the post does not include a `count` method. Updated the description to match the actual covered approaches.
- The IAM managed policy quota was described as a role having "up to 10" managed policies. Updated this to clarify that 10 is the default quota and that the quota can be increased.
- The inline policy examples used the deprecated `inline_policy` block inside `aws_iam_role`. Replaced those examples with current `aws_iam_role_policy` resources, including the reusable module example.
- The best practices section referred to the "10-policy limit" without clarifying that it is the default quota. Updated it to "default 10-policy limit" and "quota increase."

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The HCL examples were reviewed manually against the current official Terraform AWS Provider documentation.
