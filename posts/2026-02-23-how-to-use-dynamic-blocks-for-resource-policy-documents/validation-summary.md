# Validation Summary: How to Use Dynamic Blocks for Resource Policy Documents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- Terraform optional object attributes
- HashiCorp AWS provider
- AWS IAM policy documents
- Amazon S3 bucket policies
- AWS KMS key policies
- Amazon SQS queue policies

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp AWS provider `aws_iam_policy_document` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- HashiCorp AWS provider `aws_s3_bucket_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- HashiCorp AWS provider `aws_kms_key` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- HashiCorp AWS provider `aws_sqs_queue_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- AWS IAM JSON policy element reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
- AWS IAM Principal element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM Condition element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html
- AWS account identifier documentation: https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-identifiers.html
- AWS KMS key policy documentation: https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
- AWS KMS default key policy documentation: https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html
- Linked OneUptime article: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-json-policies-in-terraform/view

## Issues Found
- Several example AWS ARNs used the 9-digit placeholder account ID `123456789`. AWS account IDs are 12 digits, so these examples would be malformed. Updated them to the standard 12-digit placeholder `123456789012`.
- The introduction described IAM policies as resource policies. IAM policies are policy documents, but identity-based IAM policies are not resource-based policies. Updated the wording to "AWS policy documents" while preserving the rest of the explanation.
- The KMS key policy comment said the root account always has full access. AWS KMS key policies use the account principal statement to allow the owning account to use IAM policies for the key; it does not directly grant every IAM principal access by itself. Updated the comment to reflect that behavior.

## Review Notes
The Terraform CLI is not installed in this environment, so I could not run `terraform validate`. The HCL examples were reviewed against current Terraform language documentation and the current HashiCorp AWS provider documentation instead.
