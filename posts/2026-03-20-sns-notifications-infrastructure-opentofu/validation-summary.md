# Validation Summary: How to Set Up SNS Notifications for Infrastructure Alerts with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Provider for OpenTofu/Terraform
- Amazon SNS
- AWS KMS
- Amazon CloudWatch alarms
- Amazon SQS
- AWS Lambda
- Application Load Balancer CloudWatch metrics
- Amazon RDS CloudWatch metrics
- AWS CLI

## Sources Consulted
- OpenTofu Language Documentation: https://opentofu.org/docs/language/
- Terraform AWS Provider `aws_sns_topic` docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sns_topic.html.markdown
- Terraform AWS Provider `aws_sns_topic_subscription` docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sns_topic_subscription.html.markdown
- Terraform AWS Provider `aws_sns_topic_policy` docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sns_topic_policy.html.markdown
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- Terraform AWS Provider `aws_sqs_queue_policy` docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sqs_queue_policy.html.markdown
- Terraform AWS Provider `aws_lambda_permission` docs source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_permission.html.markdown
- Amazon SNS server-side encryption setup: https://docs.aws.amazon.com/sns/latest/dg/sns-enable-encryption-for-topic.html
- Amazon SNS KMS key management: https://docs.aws.amazon.com/sns/latest/dg/sns-key-management.html
- CloudWatch alarm SNS notifications and confused deputy guidance: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Notify_Users_Alarm_Changes.html
- Subscribing an Amazon SQS queue to an Amazon SNS topic: https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html
- Amazon SNS access policy examples for SQS delivery: https://docs.aws.amazon.com/sns/latest/dg/sns-access-policy-use-cases.html
- Invoking Lambda functions with Amazon SNS notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- Lambda resource-based permissions for AWS services: https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-services.html
- Application Load Balancer CloudWatch metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Amazon RDS CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon RDS CloudWatch dimensions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/dimensions.html
- Author GitHub profile URL: https://github.com/nawazdhandala

## Issues Found
- Added the missing `data "aws_caller_identity" "current"` data source because the KMS and SNS topic policy examples reference the current AWS account ID.
- Added `aws:SourceAccount` conditions to the CloudWatch SNS topic policy and CloudWatch KMS key statement to match AWS confused-deputy guidance for alarm notifications.
- Restricted the SNS KMS key statement with the SNS topic encryption context so the custom key is scoped to the intended encrypted topic.
- Added the required SQS queue policy allowing `sns.amazonaws.com` to call `sqs:SendMessage` from the SNS topic; without this, SNS delivery to the SQS queue would fail.
- Added explicit `depends_on` relationships so the SQS queue policy exists before the SQS subscription and the Lambda invoke permission exists before the Lambda subscription.
- Replaced the invalid Application Load Balancer metric name `5XXError` with the documented `HTTPCode_Target_5XX_Count` metric.
- Added `DBInstanceIdentifier` dimensions to the RDS `DatabaseConnections` alarms so the alarms target an actual RDS instance metric.

## Review Notes
The examples still assume surrounding resources and variables exist, including `var.aws_region`, `var.environment`, the SQS queue, Lambda function, Auto Scaling group, load balancer, and RDS instance. The author GitHub URL resolves to the expected profile. OpenTofu/Terraform CLI binaries were not installed in the workspace, so validation was performed against official documentation rather than by running `tofu validate`.
