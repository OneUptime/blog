# Validation Summary: How to Create Cross-Account IAM Roles in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS IAM roles and trust policies
- AWS STS AssumeRole
- AWS IAM external IDs
- AWS MFA condition keys
- Amazon S3 IAM permissions

## Sources Consulted
- AWS IAM User Guide: Cross account resource access in IAM - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html
- AWS IAM User Guide: The confused deputy problem - https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html
- AWS IAM User Guide: Secure API access with MFA - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_configure-api-require.html
- HashiCorp AWS Provider docs: Provider assume_role configuration - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- HashiCorp AWS Provider docs: aws_iam_policy_document data source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/iam_policy_document.html.markdown
- HashiCorp AWS Provider docs: aws_iam_role resource - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role.html.markdown
- HashiCorp AWS Provider docs: aws_iam_role_policy resource - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy.html.markdown
- HashiCorp AWS Provider docs: aws_iam_policy resource - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_policy.html.markdown
- HashiCorp AWS Provider docs: aws_iam_group_policy_attachment resource - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_group_policy_attachment.html.markdown

## Issues Found
- The introduction said the guide covered permission boundaries, but the post did not include a permission boundary example or explanation. Removed that phrase to keep the scope accurate.
- The external ID variable included a hard-coded default, which could imply the trusting account should invent the external ID. AWS guidance for third-party access says the third party should generate and supply a unique external ID for each customer, so the example now requires the value to be provided.
- The multi-role example omitted the `aws.target` provider alias even though the post configures only aliased source and target providers and describes these roles as target-account roles. Added `provider = aws.target` to the policy document, role, and policy attachment resources in that example.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform validate`. The snippets were reviewed against the current official AWS provider documentation and AWS IAM documentation instead.
