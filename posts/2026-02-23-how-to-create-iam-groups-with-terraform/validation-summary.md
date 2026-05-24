# Validation Summary: How to Create IAM Groups with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, version 1.0+)
- Terraform AWS Provider (~> 5.0)
- AWS IAM (groups, users, policies, group memberships, MFA)
- AWS Managed Policies (AmazonEC2ReadOnlyAccess, AmazonS3ReadOnlyAccess, AdministratorAccess, ReadOnlyAccess)
- IAM policy language (Version 2012-10-17)

## Sources Consulted
- Terraform AWS Provider documentation for `aws_iam_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group
- Terraform AWS Provider documentation for `aws_iam_group_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_policy
- Terraform AWS Provider documentation for `aws_iam_group_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_policy_attachment
- Terraform AWS Provider documentation for `aws_iam_group_membership`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_membership
- Terraform AWS Provider documentation for `aws_iam_user_group_membership`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_group_membership
- AWS IAM quotas reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- AWS IAM managed policies reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html
- AWS Service Authorization Reference for CloudWatch, CloudWatch Logs, CodeCommit, and IAM actions
- AWS global condition context keys (`aws:MultiFactorAuthPresent`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html

## Issues Found
No technical issues found. All Terraform resource names, arguments, AWS managed policy ARNs, IAM action names, and IAM quotas (default 10 groups per user, default 300 groups per account) are accurate. The exclusive-vs-non-exclusive distinction between `aws_iam_group_membership` and `aws_iam_user_group_membership` is correctly described. The MFA enforcement pattern (allow all when MFA present + always allow MFA-management actions so users can self-enroll) is a recognized AWS pattern and the condition key `aws:MultiFactorAuthPresent` is correct.

## Review Notes
- The MFA self-service policy uses `Resource = "*"` for the MFA management statements. The stricter AWS recommendation is to scope these to `arn:aws:iam::*:mfa/${aws:username}` and `arn:aws:iam::*:user/${aws:username}` so users can only manage their own MFA device. The example as-written works, but tightening the resource scope would be a worthwhile follow-up for least-privilege.
- The blanket `Action = "*"` in the "AllowAllWhenMFAPresent" statement is intentionally permissive to illustrate the pattern; in production this is typically combined with a separate explicit `Deny` for sensitive actions when MFA is absent, or scoped to a narrower set of actions.
- AWS IAM group/user quotas (10 groups per user, 300 groups per account) are soft limits and can be increased via AWS Support; the post correctly qualifies these as defaults.
- AWS Provider version constraint `~> 5.0` is current as of the post's date.
