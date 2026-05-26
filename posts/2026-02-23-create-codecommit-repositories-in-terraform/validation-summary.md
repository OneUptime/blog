# Validation Summary: How to Create CodeCommit Repositories in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS CodeCommit
- AWS SNS
- AWS Lambda
- AWS IAM
- AWS CodeStar Notifications
- Git

## Sources Consulted
- Terraform AWS provider documentation for `aws_codecommit_repository`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codecommit_repository
- Terraform AWS provider documentation for `aws_codecommit_trigger`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codecommit_trigger
- Terraform AWS provider documentation for `aws_codecommit_approval_rule_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codecommit_approval_rule_template
- Terraform AWS provider documentation for `aws_codestarnotifications_notification_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codestarnotifications_notification_rule
- AWS CodeCommit approval rule template documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/approval-rule-templates.html
- AWS CodeCommit approval rule template management documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-manage-templates.html
- AWS CodeCommit approval pool documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-create-template.html
- AWS CodeCommit trigger documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-notify-edit.html
- AWS CodeCommit IAM condition key documentation: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awscodecommit.html
- AWS CodeCommit branch restriction documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-conditional-branch.html
- AWS Developer Tools notification rule documentation: https://docs.aws.amazon.com/dtconsole/latest/userguide/concepts.html
- AWS Developer Tools SNS target policy documentation: https://docs.aws.amazon.com/dtconsole/latest/userguide/set-up-sns.html
- AWS CodeCommit quotas documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/limits.html

## Issues Found
- The SNS topic policy only allowed `codecommit.amazonaws.com` to publish. This works for classic CodeCommit repository triggers, but the later CodeStar Notifications rule reuses the same SNS topic and requires publish permission for `codestar-notifications.amazonaws.com`. Added a second SNS policy statement for AWS CodeStar Notifications.
- The approval rule template used an account root ARN as a broad approval pool member and described IAM role ARNs as approval pool members. AWS documents approval pools using CodeCommit approver patterns, IAM user ARNs, and STS assumed-role ARN patterns with wildcards for role sessions. Removed the unsupported broad root ARN from the generic approval rule and changed the role-specific example to use `arn:aws:sts::ACCOUNT_ID:assumed-role/PlatformTeamRole/*`.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL snippets were manually reviewed against the current Terraform AWS provider resource schemas and AWS documentation.
- AWS CodeCommit was reopened to new customers on November 25, 2025 according to AWS documentation history, so the post is not obsolete as of the validation date.
