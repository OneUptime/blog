# Validation Summary: How to Create Reusable Terraform Modules for IAM Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS IAM roles
- AWS IAM trust policies
- AWS managed policies and inline policies
- AWS IAM instance profiles

## Sources Consulted
- HashiCorp AWS provider documentation: `aws_iam_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- HashiCorp AWS provider documentation: `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- HashiCorp AWS provider documentation: `aws_iam_role_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- HashiCorp AWS provider documentation: `aws_iam_role_policy_attachment` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- HashiCorp AWS provider documentation: `aws_iam_instance_profile` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- AWS IAM User Guide: Methods to assume a role: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage-assume.html
- AWS IAM User Guide: AWS JSON policy elements, Principal: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS Systems Manager documentation: AWS managed policies for Systems Manager: https://docs.aws.amazon.com/systems-manager/latest/userguide/security-iam-awsmanpol.html
- Amazon CloudWatch documentation: AWS managed policies for CloudWatch: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/managed-policies-cloudwatch.html
- AWS Lambda documentation: AWS managed policies for Lambda: https://docs.aws.amazon.com/lambda/latest/dg/security-iam-awsmanpol.html

## Issues Found
- The generated trust policy combined service principals, account principals, and role principals into one `principals` block and selected either `Service` or `AWS` as the principal type. This would produce an invalid or incorrect trust policy when `trusted_services` is used together with `trusted_accounts` or `trusted_roles`, because AWS service principals and AWS account/role principals must be represented under their respective principal types. Updated the snippet to emit separate dynamic `principals` blocks for `Service` and `AWS` identifiers.

## Review Notes
- Terraform was not installed in the local workspace, so `terraform fmt` and `terraform validate` could not be run. The HCL was reviewed against the official AWS provider documentation.
- The module defaults allow all trusted principal inputs to be empty when no custom assume-role policy is provided. That configuration would not be useful for an assumable role and may fail at apply time, but the provided examples all include a valid trusted principal.
