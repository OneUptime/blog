# Validation Summary: How to Use the transpose Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform collection functions
- AWS IAM role policy attachments

## Sources Consulted
- HashiCorp Terraform documentation: transpose function - https://developer.hashicorp.com/terraform/language/functions/transpose
- HashiCorp Terraform documentation: built-in functions and Terraform console examples - https://developer.hashicorp.com/terraform/language/functions
- Terraform Registry: aws_iam_role_policy_attachment resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- AWS IAM documentation: Amazon Resource Name formats - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html
- OneUptime values function link - https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-values-function-in-terraform/view
- OneUptime zipmap function link - https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-zipmap-function-in-terraform/view

## Issues Found
- The IAM policy attachment example used policy strings like `arn:aws:iam::policy/ReadOnly`, which are not valid IAM policy ARNs for `aws_iam_role_policy_attachment.policy_arn`. Updated the example to use valid AWS managed policy ARN formats, such as `arn:aws:iam::aws:policy/ReadOnlyAccess`, and updated the expected `transpose` output comments to match.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were verified against official HashiCorp documentation rather than by running `terraform console`. The related OneUptime links returned HTTP 200.
