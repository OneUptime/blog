# Validation Summary: How to Set Up IAM Permission Boundaries with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM
- IAM permission boundaries
- AWS IAM policies

## Sources Consulted
- AWS IAM User Guide, Permissions boundaries for IAM entities: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS IAM User Guide, IAM and AWS STS condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS Service Authorization Reference, Actions, resources, and condition keys for AWS Identity and Access Management (IAM): https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsidentityandaccessmanagementiam.html
- AWS IAM API Reference, CreateRole: https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateRole.html
- AWS IAM API Reference, PutRolePermissionsBoundary: https://docs.aws.amazon.com/IAM/latest/APIReference/API_PutRolePermissionsBoundary.html
- OpenTofu docs, Command: init: https://opentofu.org/docs/cli/init/
- OpenTofu docs, Command: plan: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, Command: apply: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu docs, jsonencode function: https://opentofu.org/docs/language/functions/jsonencode/
- HashiCorp AWS provider docs, aws_iam_role: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- HashiCorp AWS provider docs, aws_iam_policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- HashiCorp AWS provider docs, aws_iam_group_policy_attachment: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_policy_attachment
- HashiCorp AWS provider docs, aws_caller_identity: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity

## Issues Found
- The introduction and conclusion overstated what permission boundaries do. I changed the wording to match AWS documentation: boundaries limit what identity-based policies can grant, and they do not grant permissions on their own.
- The Step 1 boundary policy example included `iam:PassRole` in a statement conditioned on `iam:PermissionsBoundary`. AWS documents `iam:PassRole` as using `iam:AssociatedResourceArn` and `iam:PassedToService`, not `iam:PermissionsBoundary`, so I removed that invalid usage.
- The examples referenced `data.aws_caller_identity.current.account_id` without defining the `aws_caller_identity` data source. I added the missing data source.
- The group policy attachment example referenced `aws_iam_group.developers` without defining the group resource. I added the missing `aws_iam_group` resource so the snippet is self-consistent.

## Review Notes
AWS evaluates permission boundaries alongside other policy types such as resource-based policies, session policies, and SCPs. The revised post now scopes its core explanation to identity-based policies, which matches the official IAM documentation.
