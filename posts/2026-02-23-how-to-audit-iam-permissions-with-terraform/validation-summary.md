# Validation Summary: How to Audit IAM Permissions with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS IAM
- AWS Config
- Amazon EventBridge / CloudWatch Events
- Amazon SNS
- Amazon S3

## Sources Consulted
- HashiCorp AWS Provider documentation: `aws_iam_users` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_users
- HashiCorp AWS Provider documentation: `aws_iam_user` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_user
- HashiCorp AWS Provider documentation: `aws_iam_policy` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy
- HashiCorp AWS Provider documentation: `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- HashiCorp AWS Provider documentation: `aws_iam_roles` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_roles
- HashiCorp AWS Provider documentation: `aws_iam_role` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_role
- AWS Config managed rule documentation: `IAM_USER_UNUSED_CREDENTIALS_CHECK`: https://docs.aws.amazon.com/config/latest/developerguide/iam-user-unused-credentials-check.html
- HashiCorp AWS Provider documentation: `aws_config_config_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule
- AWS EventBridge resource-based policy documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- HashiCorp AWS Provider documentation: `aws_sns_topic_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy
- Terraform function documentation: `jsonencode`: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform function documentation: `jsondecode`: https://developer.hashicorp.com/terraform/language/functions/jsondecode

## Issues Found
- The post used a nonexistent `aws_iam_policies` data source to list all IAM policies. Replaced it with an `audit_policy_arns` input variable and updated dependent examples to fetch selected managed policies with the supported `aws_iam_policy` data source.
- The user discovery section claimed `aws_iam_user` returned attached policies. The official data source returns user metadata, not attached policy lists, so the wording and comments were corrected.
- The wildcard policy detection used regex checks against JSON strings and only matched scalar `"Action": "*"` and `"Resource": "*"`. Replaced this with `jsondecode`-based checks that handle policy statements and list values more accurately.
- The AWS Config example included an incomplete configuration recorder and IAM role setup, and used a string for `maxCredentialUsageAge` even though the managed rule parameter is an integer. Simplified the example to the managed rule itself and changed the parameter to `90`.
- The inline policy example used `data "aws_iam_user_policy"` without a required policy name and treated absence of an inline policy as a successful audit signal. Replaced it with a supported review list and retained EventBridge monitoring for inline policy changes.
- The EventBridge-to-SNS example was missing the SNS topic resource policy required for EventBridge to publish to an SNS target. Added `aws_sns_topic_policy` granting `events.amazonaws.com` `sns:Publish`.
- Quoted the EventBridge event pattern key `"detail-type"` inside the `jsonencode` object to avoid HCL parsing ambiguity.
- Updated summary wording so the article no longer claims Terraform discovers all managed IAM policies automatically with the AWS provider.

## Review Notes
Terraform CLI is not installed in this workspace, so validation was performed against official Terraform, AWS provider, and AWS service documentation rather than by running `terraform validate`.
