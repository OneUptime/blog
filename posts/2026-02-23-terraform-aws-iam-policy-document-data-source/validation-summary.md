# Validation Summary: How to Use the aws_iam_policy_document Data Source Instead of JSON

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS IAM policy documents
- AWS S3, DynamoDB, CloudWatch Logs, X-Ray, SQS, and STS IAM actions
- Terraform HCL dynamic blocks and type constraints
- Terraform `jsonencode`

## Sources Consulted
- HashiCorp AWS Provider `aws_iam_policy_document` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- HashiCorp AWS Provider source documentation for `aws_iam_policy_document`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/iam_policy_document.html.markdown
- Terraform `dynamic` blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform `replace` function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- Terraform `jsonencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- AWS IAM JSON policy element reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
- AWS IAM condition operators documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM global condition context keys documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM Principal element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM NotPrincipal element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_notprincipal.html
- AWS IAM Sid element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_sid.html

## Issues Found
- The post described the data source as providing "full validation" and broadly catching errors before AWS API calls. The AWS provider validates the Terraform schema and policy document structure, but it does not prove every IAM action, resource, condition, or service-specific semantic choice is correct. Updated the wording to "structural validation" and "many structural errors."
- The merging explanation said conflicting statement IDs in `source_policy_documents` use last-one-wins behavior. The official provider documentation says source policy documents must have unique non-blank Sids; override documents and inline statements are the mechanisms for replacing statements with matching non-blank Sids. Updated the explanation accordingly.
- The dynamic statement example built `sid` values by removing only hyphens from bucket names. IAM Sids support only ASCII letters and numbers, while S3 bucket names can include dots. Updated the expression to remove all non-alphanumeric characters.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate` against extracted snippets. The HCL examples were reviewed against the official Terraform language and AWS provider documentation instead. The `NotPrincipal` example is syntactically supported by the data source, but AWS recommends using deny statements with condition keys instead of `NotPrincipal` in many resource-based policy scenarios, especially where permissions boundaries may be involved.
