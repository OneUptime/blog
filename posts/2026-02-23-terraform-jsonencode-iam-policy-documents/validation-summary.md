# Validation Summary: How to Use jsonencode for IAM Policy Documents in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform HCL
- Terraform `jsonencode`
- AWS IAM policy JSON
- AWS IAM roles and trust policies
- AWS S3, SSM Parameter Store, DynamoDB, and SQS IAM actions

## Sources Consulted
- Terraform `jsonencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform `validate` command documentation: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform expressions documentation: https://developer.hashicorp.com/terraform/language/expressions
- Terraform AWS provider `aws_iam_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Terraform AWS provider `aws_iam_role` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS provider `aws_iam_policy_document` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS IAM JSON policy element reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
- AWS IAM `Action` element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html
- AWS IAM `Resource` element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_resource.html
- AWS IAM condition operators documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM global condition context keys documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM policy grammar documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html
- AWS IAM supported policy data types documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_datatypes.html
- AWS Service Authorization Reference for Amazon S3 actions and resource types: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html

## Issues Found
- The post overstated Terraform validation for raw heredoc JSON by saying Terraform cannot validate the structure until AWS rejects it. Updated the wording to clarify that Terraform treats the heredoc as a string and IAM-specific mistakes are often caught only when AWS evaluates the policy.
- The post described `jsonencode` as providing broad early validation. Updated the wording to specify that Terraform validates the HCL expression structure, not full IAM policy semantics.
- The comparison with `aws_iam_policy_document` referred generally to "Terraform-native validation." Updated it to "Terraform-native policy construction and document-shape checks" to avoid implying complete IAM semantic validation.

## Review Notes
Terraform was not installed in the local environment, so snippets were reviewed against official Terraform language documentation rather than executed with `terraform validate`. The HCL examples use current Terraform expression syntax, and the IAM examples use valid policy elements and current AWS IAM action/resource naming.
