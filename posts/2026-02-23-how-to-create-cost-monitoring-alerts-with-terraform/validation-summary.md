# Validation Summary: How to Create Cost Monitoring Alerts with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Budgets
- Amazon CloudWatch billing alarms
- Amazon SNS
- AWS Lambda
- Amazon EventBridge scheduled rules
- AWS Cost Explorer API
- AWS IAM

## Sources Consulted
- Terraform Registry: `aws_budgets_budget` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget.html
- Terraform Registry: `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform Registry: `aws_sns_topic`, `aws_sns_topic_subscription`, and `aws_sns_topic_policy` resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- Terraform Registry: `aws_lambda_function`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, and `aws_lambda_permission` resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS CloudWatch documentation: Create a billing alarm to monitor estimated AWS charges: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- AWS CloudWatch documentation: Notifying users on alarm changes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Notify_Users_Alarm_Changes.html
- AWS Cost Management documentation: Creating an Amazon SNS topic for budget notifications: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html
- AWS Cost Management documentation: Using the AWS Cost Explorer API: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-api.html

## Issues Found
- The post described CloudWatch billing alarms as "real-time." AWS publishes estimated charge metrics several times daily and billing alarms do not use projections, so the wording was changed to "estimated charge notifications/monitoring" and the CloudWatch section now notes the billing alerts prerequisite.
- The provider comment said "Billing data is only available in us-east-1." This was narrowed to "CloudWatch billing metrics" because the key regional constraint in the post is CloudWatch billing metrics being stored in US East (N. Virginia).
- The Budget and SNS resources were not consistently tied to the billing provider alias, while CloudWatch billing alarms are created in `us-east-1`. The affected billing, SNS, and daily cost report resources now use `provider = aws.billing` so the alerting path is regionally consistent.
- The SNS topic policy only allowed `budgets.amazonaws.com` to publish to a topic that was also used by CloudWatch alarms, and it omitted the recommended confused-deputy conditions. The policy now preserves topic-owner access, allows AWS Budgets with `aws:SourceAccount` and `aws:SourceArn`, and allows CloudWatch alarm publishing to the standard alert topic with the same protections.

## Review Notes
- The Lambda snippet references a prebuilt `lambda/cost_report.zip`; the post does not include the Lambda source code or packaging steps. That is acceptable for a Terraform-focused guide, but a future expansion could include the Python handler and build command.
- Email SNS subscriptions require recipients to confirm the subscription before notifications are delivered.
