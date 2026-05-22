# Validation Summary: How to Use Data Sources to Look Up IAM Policies in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS IAM
- AWS Lambda
- HCL

## Sources Consulted
- Terraform language documentation: Data sources: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform language documentation: for_each meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp AWS Provider documentation: aws_iam_policy data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy
- HashiCorp AWS Provider documentation: aws_iam_policy_document data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- HashiCorp AWS Provider documentation: aws_iam_role data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_role
- HashiCorp AWS Provider documentation: aws_iam_role_policy_attachment resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- HashiCorp AWS Provider documentation: aws_lambda_function resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda documentation: Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS IAM documentation: Managed policies and inline policies: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html

## Issues Found
- The custom IAM policy example claimed to look up a policy with a specific path prefix but did not set `path_prefix`. Added `path_prefix = "/teams/data/"`, matching the `aws_iam_policy` data source arguments.
- The custom IAM role example referenced `data.aws_iam_policy_document.assume_role.json` without defining that data source. Added a minimal trust policy document so the example is complete.
- The section titled "Looking Up IAM Roles with Attached Policies" implied the `aws_iam_role` data source can be used to inspect attached policies, but the documented data source exposes role properties such as ARN and assume role policy, not attached managed policies. Retitled and reworded the section to describe referencing an existing role ARN.
- The Lambda example used `nodejs18.x`, which AWS lists as deprecated as of September 1, 2025. Updated the example to `nodejs24.x`, a current documented Lambda runtime.
- The error handling section said lookup failures always happen during plan. Terraform can defer data source reads to apply when arguments are unknown during planning, so the wording now notes that failures usually occur during plan but can occur during apply.

## Review Notes
The IAM policy lookup, `aws_iam_policy_document`, merge, attachment, and `for_each` examples otherwise match current Terraform and AWS provider documentation. Some examples still rely on placeholder resource names, account IDs, bucket names, and packaged Lambda artifacts, which is normal for tutorial snippets.
