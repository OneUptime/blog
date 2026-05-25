# Validation Summary: How to Create SSO Permission Sets in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS IAM Identity Center
- AWS SSO Admin
- AWS Identity Store
- AWS IAM policies
- AWS Organizations

## Sources Consulted
- HashiCorp AWS Provider docs for `aws_ssoadmin_permission_set`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permission_set
- HashiCorp AWS Provider docs for `aws_ssoadmin_instances`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssoadmin_instances
- HashiCorp AWS Provider docs for `aws_identitystore_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/identitystore_group
- HashiCorp AWS Provider docs for `aws_ssoadmin_account_assignment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_account_assignment
- HashiCorp AWS Provider docs for `aws_ssoadmin_managed_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_managed_policy_attachment
- HashiCorp AWS Provider docs for `aws_ssoadmin_permission_set_inline_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permission_set_inline_policy
- HashiCorp AWS Provider docs for `aws_ssoadmin_customer_managed_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_customer_managed_policy_attachment
- HashiCorp AWS Provider docs for `aws_ssoadmin_permissions_boundary_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permissions_boundary_attachment
- AWS IAM Identity Center docs on organization and account instances: https://docs.aws.amazon.com/singlesignon/latest/userguide/identity-center-instances.html
- AWS IAM Identity Center docs on IAM Identity Center and AWS Organizations: https://docs.aws.amazon.com/singlesignon/latest/userguide/identity-center-and-orgs.html
- AWS IAM Identity Center docs on custom permissions, customer managed policies, and permissions boundaries: https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetcustom.html
- AWS managed policy reference for `PowerUserAccess`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/PowerUserAccess.html
- AWS Service Authorization Reference for AWS Billing Console actions: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsbillingconsole.html

## Issues Found
- The prerequisites said "AWS Organizations set up (SSO requires it)." AWS Organizations is recommended but not required for every IAM Identity Center use case because AWS supports account instances. Permission sets for multi-account AWS account access require an organization instance, so the prerequisite was updated to be specific to multi-account permission sets.
- The inline policy comment said it allowed changes to roles with an `app-` prefix, but the condition checks the `iam:ResourceTag/ManagedBy` tag value. The comment was corrected to match the policy condition.

## Review Notes
- The Terraform SSO Admin and Identity Store resource/data source names and arguments used in the examples match current HashiCorp AWS Provider documentation.
- Terraform was not installed in the local workspace, so local `terraform validate` could not be run. Validation was performed against official Terraform provider and AWS documentation.
- The example uses AWS provider `~> 5.0`; AWS provider 6.x is current, but the v5 resource names and arguments shown remain valid and are not deprecated in the reviewed documentation.
