# Validation Summary: How to Use AWS SSO Permission Sets for Multi-Account Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM Identity Center
- AWS SSO Admin API and AWS CLI
- AWS IAM permission sets, managed policies, customer managed policies, inline policies, and permissions boundaries
- AWS Organizations multi-account access
- Terraform AWS provider
- AWS CloudTrail

## Sources Consulted
- AWS IAM Identity Center User Guide: Manage AWS accounts with permission sets - https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetsconcept.html
- AWS IAM Identity Center User Guide: Set session duration for AWS accounts - https://docs.aws.amazon.com/singlesignon/latest/userguide/howtosessionduration.html
- AWS IAM Identity Center User Guide: Use IAM policies in permission sets - https://docs.aws.amazon.com/singlesignon/latest/userguide/howtocmp.html
- AWS CLI Command Reference: create-permission-set - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/create-permission-set.html
- AWS CLI Command Reference: attach-managed-policy-to-permission-set - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/attach-managed-policy-to-permission-set.html
- AWS CLI Command Reference: put-inline-policy-to-permission-set - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/put-inline-policy-to-permission-set.html
- AWS CLI Command Reference: attach-customer-managed-policy-reference-to-permission-set - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/attach-customer-managed-policy-reference-to-permission-set.html
- AWS CLI Command Reference: put-permissions-boundary-to-permission-set - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/put-permissions-boundary-to-permission-set.html
- AWS CLI Command Reference: create-account-assignment - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/create-account-assignment.html
- AWS CLI Command Reference: provision-permission-set - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/provision-permission-set.html
- AWS CLI Command Reference: list-permission-set-provisioning-status - https://docs.aws.amazon.com/cli/latest/reference/sso-admin/list-permission-set-provisioning-status.html
- Terraform Registry: aws_ssoadmin_permission_set - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permission_set
- Terraform Registry: aws_ssoadmin_managed_policy_attachment - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_managed_policy_attachment
- Terraform Registry: aws_ssoadmin_account_assignment - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_account_assignment
- Terraform Registry: aws_ssoadmin_instances data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssoadmin_instances
- Terraform Registry: aws_identitystore_group data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/identitystore_group
- AWS IAM Identity Center User Guide: Logging IAM Identity Center API calls with AWS CloudTrail - https://docs.aws.amazon.com/singlesignon/latest/userguide/logging-using-cloudtrail.html

## Issues Found
- The post said permission set changes "propagate automatically." This was too broad because AWS CLI policy changes to an assigned permission set require `ProvisionPermissionSet` to apply updated IAM policies to target accounts. Updated the wording to say assignments provision roles and policy updates can be pushed by reprovisioning.
- The inline policy description mentioned EC2 and S3 access, but the JSON also allowed CloudWatch and CloudWatch Logs. Updated the description to match the policy.
- The Terraform example referenced `data.aws_ssoadmin_instances.main` and `aws_identitystore_group.devops` without defining them, and indexed the SSO Admin instance data source sets directly. Added the required data sources and changed references to `tolist(...)`, matching the current Terraform AWS provider examples.

## Review Notes
The AWS CLI commands and option names are current and match the AWS CLI v2 SSO Admin command reference. Customer managed policy behavior, session duration limits, account assignment behavior, reprovisioning guidance, and CloudTrail logging guidance align with current AWS IAM Identity Center documentation.
