# Validation Summary: How to Create IAM Groups and Group Policies with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM
- IAM groups
- IAM policies
- AWS STS
- HCL

## Sources Consulted
- AWS IAM User Guide, Create IAM groups: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_create.html
- AWS IAM User Guide, Edit users in IAM groups: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups_manage_add-remove-users.html
- AWS IAM User Guide, When do I use IAM?: https://docs.aws.amazon.com/IAM/latest/UserGuide/when-to-use-iam.html
- AWS IAM User Guide, IAM JSON policy elements: Condition: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html
- AWS IAM User Guide, IAM JSON policy elements: Condition operators: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM User Guide, IAM and AWS STS condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS Service Authorization Reference, Actions, resources, and condition keys for AWS Identity and Access Management (IAM): https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsidentityandaccessmanagementiam.html
- AWS IAM User Guide, Troubleshoot IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot.html
- OpenTofu docs, Initializing Working Directories: https://opentofu.org/docs/cli/init/
- OpenTofu docs, Command: plan: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, Command: apply: https://opentofu.org/docs/v1.11/cli/commands/apply/
- HashiCorp AWS provider docs, `aws_iam_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_group.html.markdown
- HashiCorp AWS provider docs, `aws_iam_group_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_group_policy.html.markdown
- HashiCorp AWS provider docs, `aws_iam_group_policy_attachment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_group_policy_attachment.html.markdown
- HashiCorp AWS provider docs, `aws_iam_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_policy.html.markdown
- HashiCorp AWS provider docs, `aws_iam_user`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_user.html.markdown
- HashiCorp AWS provider docs, `aws_iam_user_group_membership`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_user_group_membership.html.markdown
- HashiCorp AWS provider docs, `aws_caller_identity`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/caller_identity.html.markdown

## Issues Found
- The DevOps policy example referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. I added `data "aws_caller_identity" "current" {}` so the ARN interpolation is valid.
- The DevOps IAM policy mixed `iam:List*`, `iam:Get*`, `iam:PassRole`, `iam:AttachRolePolicy`, and `iam:DetachRolePolicy` in a single statement conditioned on `iam:PermissionsBoundary`. AWS documents that missing condition keys make the condition evaluate false, so the read-only actions would not work under that condition, and `iam:PassRole` uses `iam:AssociatedResourceArn` and `iam:PassedToService` rather than `iam:PermissionsBoundary`. I split the read-only actions into their own statement, removed the invalid `iam:PassRole` usage, and kept the boundary condition only on role policy attachment/detachment with the appropriate ARN operator.
- The conclusion said IAM groups are the standard solution for human users in AWS organizations and that membership changes take effect instantly. I corrected that to reflect current AWS guidance toward federation or IAM Identity Center for human users, and AWS's documented eventual consistency for IAM changes.

## Review Notes
- The post is technically correct after the fixes above.
- The examples still assume supporting inputs such as `var.project_name` and `var.developer_usernames` already exist in the reader's configuration; that is a context omission, not a technical error in the resources shown.
- The local `tofu` CLI was not installed in this environment, so command verification was done against official OpenTofu documentation rather than live `tofu --help` output.
