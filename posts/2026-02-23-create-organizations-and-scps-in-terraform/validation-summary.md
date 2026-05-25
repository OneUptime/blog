# Validation Summary: How to Create Organizations and SCPs in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Organizations
- AWS Service Control Policies
- AWS tag policies
- AWS delegated administrator integrations

## Sources Consulted
- Terraform AWS Provider `aws_organizations_organization`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_organization
- Terraform AWS Provider `aws_organizations_account`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_account
- Terraform AWS Provider `aws_organizations_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy
- Terraform AWS Provider `aws_organizations_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy_attachment
- AWS Organizations service control policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS Organizations SCP syntax: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_syntax.html
- AWS Organizations tag policy syntax and examples: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_example-tag-policies.html
- AWS Organizations tag policy supported resources: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_supported-resources-enforcement.html
- AWS Organizations CloseAccount API: https://docs.aws.amazon.com/organizations/latest/APIReference/API_CloseAccount.html
- AWS GuardDuty service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonguardduty.html
- AWS Security Hub service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awssecurityhub.html

## Issues Found
- The organization example used `feature_set = "ALL_FEATURES"`, but the Terraform AWS provider expects `ALL` or `CONSOLIDATED_BILLING`. Changed the example and comment to use `feature_set = "ALL"`.
- The account lifecycle comments said AWS accounts cannot be deleted via API and implied `ignore_changes` prevents deletion. AWS Organizations supports member account closure through `CloseAccount`, and Terraform also supports account removal/closure behavior. Added `prevent_destroy = true` and rewrote the comments and best practice to distinguish accidental destroy protection from `role_name` drift handling.
- The SCP overview said SCPs apply to all principals in target accounts. AWS documents SCPs as applying to member-account users and roles, including root users, with exceptions such as service-linked roles. Reworded the description accordingly.
- The region restriction SCP claimed to exclude global services but only exempted a specific role ARN. Replaced `Action = "*"` with `NotAction` entries for common global services so the policy matches the documented region-deny pattern.
- The tag policy example was described as requiring tags, but the shown `enforced_for` policy standardizes allowed values for a tag when used. Updated the comment, policy name, and description to avoid overstating its behavior.

## Review Notes
Terraform was not installed in the workspace, so `terraform validate` could not be run locally. The snippets were reviewed against the current official Terraform AWS provider and AWS Organizations documentation.
