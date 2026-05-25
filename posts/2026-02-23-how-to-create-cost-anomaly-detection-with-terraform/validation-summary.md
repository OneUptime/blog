# Validation Summary: How to Create Cost Anomaly Detection with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Cost Anomaly Detection
- AWS Cost Explorer / Cost Explorer API
- Amazon SNS
- Amazon CloudWatch alarms and anomaly detection
- Amazon EventBridge
- AWS Lambda
- AWS IAM policies

## Sources Consulted
- Terraform AWS Provider documentation for `aws_ce_anomaly_monitor`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_anomaly_monitor
- Terraform AWS Provider documentation for `aws_ce_anomaly_subscription`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_subscription.html.markdown
- Terraform AWS Provider documentation for `aws_cloudwatch_metric_alarm`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- Terraform AWS Provider documentation for `aws_cloudwatch_event_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_rule.html.markdown
- Terraform AWS Provider documentation for `aws_cloudwatch_event_target`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_target.html.markdown
- Terraform AWS Provider documentation for `aws_lambda_permission`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- AWS Cost Management documentation for Cost Anomaly Detection: https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html
- AWS Cost Management documentation for SNS anomaly notifications: https://docs.aws.amazon.com/cost-management/latest/userguide/ad-SNS.html
- AWS Cost Management documentation for Cost Anomaly Detection with EventBridge: https://docs.aws.amazon.com/cost-management/latest/userguide/cad-eventbridge.html
- Amazon EventBridge reference for AWS Cost Explorer events: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-ce.html
- Amazon CloudWatch documentation for anomaly detection: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html
- Amazon CloudWatch `PutMetricAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- OneUptime linked post, "How to Implement Cost Governance with Terraform": https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-governance-with-terraform/view
- OneUptime linked post, "How to Monitor Cloud Spend with Terraform": https://oneuptime.com/blog/post/2026-02-23-how-to-monitor-cloud-spend-with-terraform/view

## Issues Found
- The Cost Anomaly Detection SNS topic lacked a topic policy allowing the `costalerts.amazonaws.com` service principal to publish. Added an `aws_iam_policy_document` and `aws_sns_topic_policy`, plus explicit `depends_on` references for Cost Explorer anomaly subscriptions.
- The CloudWatch billing anomaly alarm examples did not account for AWS/Billing metrics being published in `us-east-1`. Added a `us-east-1` provider alias and attached it to the billing alarm resources.
- The CloudWatch anomaly band metric queries were marked with `return_data = true`. Updated the anomaly band queries to `return_data = false` so the alarm watches the metric query while using the band as `threshold_metric_id`, matching the CloudWatch anomaly alarm model.
- The EventBridge rule used the incorrect Cost Anomaly Detection detail type `Cost Anomaly Detection Alert`. Changed it to the documented `Anomaly Detected` detail type.
- The EventBridge-to-Lambda path lacked Lambda invoke permission for `events.amazonaws.com`. Added an `aws_lambda_permission` resource for the EventBridge rule.
- The SNS-to-Lambda subscription could be created before Lambda invoke permission. Added an explicit `depends_on` reference to the SNS topic subscription.

## Review Notes
The examples are still intentionally partial Terraform snippets and assume supporting variables, Lambda packaging, and IAM role resources exist elsewhere in the configuration. Cost allocation tag monitors also require the relevant tags to be available for cost allocation in AWS cost data.
