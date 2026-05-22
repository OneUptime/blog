# Validation Summary: How to Handle Polymorphic Resources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform HCL
- Terraform modules, outputs, variables, conditional expressions, `count`, and `for_each`
- AWS provider resources for RDS, DynamoDB, ElastiCache, CloudWatch, SNS, Systems Manager Parameter Store, and AWS Chatbot

## Sources Consulted
- Terraform conditional expressions: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- Terraform `count` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform dynamic blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform types and values, including `null`: https://developer.hashicorp.com/terraform/language/expressions/types
- AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_elasticache_replication_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- AWS provider `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS provider `aws_chatbot_slack_channel_configuration` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/chatbot_slack_channel_configuration
- AWS provider `aws_sns_topic_subscription` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription

## Issues Found
- The first module-selection example returned whole module objects from a conditional expression. Terraform conditional result values must have consistent types, and different child modules can expose different object shapes. Changed the local value to construct a consistent object with the common output fields in each branch.
- The section titled "Dynamic Blocks for Polymorphic Attributes" did not use Terraform `dynamic` blocks. Terraform dynamic blocks generate repeatable nested blocks, while this example uses `for_each`, locals, and direct resource arguments. Renamed the section and tag to describe the actual Terraform feature used.
- The Slack notification example referenced `aws_sns_topic.slack[each.key].arn` without declaring `aws_sns_topic.slack`. Added the missing SNS topic resource for Slack channels.
- The notification channel variable claimed support for PagerDuty and generic webhooks, but the example only implemented email and Slack. Narrowed the inline comments to the implemented channel types so the snippet does not imply missing resources are present.

## Review Notes
- The snippets are illustrative and omit surrounding provider configuration, required variables, IAM role definitions, and full child module implementations.
- `terraform` was not installed in the workspace, so validation was based on official Terraform language documentation and AWS provider documentation rather than a local `terraform validate` run.
