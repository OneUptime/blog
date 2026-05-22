# Validation Summary: How to Use For Expressions with Nested Data in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform for expressions
- Terraform collection functions: `flatten` and `setproduct`
- Terraform `for_each`
- AWS Terraform provider resources for VPCs, subnets, security groups, and IAM users

## Sources Consulted
- HashiCorp Terraform documentation: For expressions - https://developer.hashicorp.com/terraform/language/expressions/for
- HashiCorp Terraform documentation: `flatten` function - https://developer.hashicorp.com/terraform/language/functions/flatten
- HashiCorp Terraform documentation: `setproduct` function - https://developer.hashicorp.com/terraform/language/functions/setproduct
- HashiCorp Terraform documentation: `for_each` meta-argument - https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform AWS provider documentation: `aws_iam_user_policy_attachment` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_policy_attachment
- AWS managed policy reference: `ReadOnlyAccess` - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/ReadOnlyAccess.html
- AWS managed policy reference: `AmazonS3FullAccess` - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonS3FullAccess.html
- AWS managed policy reference: `AdministratorAccess` - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AdministratorAccess.html

## Issues Found
- The IAM user policy attachment example constructed AWS managed policy ARNs as `arn:aws:iam::policy/${each.value.policy}`. AWS managed policy ARNs use the AWS managed policy account segment, for example `arn:aws:iam::aws:policy/ReadOnlyAccess`. Updated the snippet to use `arn:aws:iam::aws:policy/${each.value.policy}`.
- The IAM example used `S3FullAccess`, which is not the AWS managed policy name. Updated it to `AmazonS3FullAccess`, matching the AWS managed policy reference.

## Review Notes
The Terraform examples are illustrative snippets and omit surrounding provider configuration and variable declarations such as `var.project` and `var.vpc_id`. The nested `for` expression, filtering, `flatten`, `setproduct`, and `for_each` usage are consistent with current Terraform documentation.
