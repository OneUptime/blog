# Validation Summary: How to Monitor SNS with CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SNS
- Amazon CloudWatch metrics, alarms, dashboards, and anomaly detection
- Amazon CloudWatch Logs and metric filters
- Terraform AWS provider
- AWS CLI
- Python boto3

## Sources Consulted
- Amazon SNS CloudWatch metrics and dimensions: https://docs.aws.amazon.com/sns/latest/dg/sns-monitoring-using-cloudwatch.html
- Amazon SNS delivery status logging: https://docs.aws.amazon.com/sns/latest/dg/sns-topic-attributes.html
- Amazon SNS delivery status logging prerequisites and log group naming: https://docs.aws.amazon.com/sns/latest/dg/topics-attrib-prereq.html
- Amazon SNS HTTP/S delivery retry behavior: https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
- Amazon SNS HTTP/S endpoint response handling: https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.prepare.html
- Amazon SNS Publish API message size limits: https://docs.aws.amazon.com/sns/latest/api/API_Publish.html
- AWS CLI cloudwatch put-dashboard command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-dashboard.html
- AWS CLI logs put-metric-filter command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/put-metric-filter.html
- AWS CLI logs filter-log-events command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html
- boto3 CloudWatch get_metric_statistics reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- Terraform aws_sns_topic resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic
- Terraform aws_cloudwatch_metric_alarm resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- SNS delivery metrics were described as directly comparable to published messages. Updated the text to account for subscriber fanout because delivered notifications can differ from published messages when a topic has multiple subscribers.
- The delivery failure metric was described as meaning messages are being lost. Updated this to a more accurate statement that messages might not be reaching subscribers, because retry behavior and DLQs affect final handling.
- The first alarm was described as firing after 5 minutes, but the Terraform snippet uses two 300-second evaluation periods. Updated the text to say two consecutive 5-minute periods.
- The per-subscriber/protocol metric section used an unsupported `Protocol` CloudWatch dimension for SNS topic metrics. Reworked the section and Python example to use the documented `TopicName` dimension and direct protocol-level troubleshooting to delivery status logs.
- The Python example used `datetime.utcnow()`, which is deprecated in Python 3.12. Updated it to use timezone-aware UTC timestamps.
- The dashboard JSON was described as a CloudFormation snippet, but it is a CloudWatch dashboard body for `put-dashboard`. Corrected the wording.
- The delivery status logging section said the Terraform enabled SQS and Lambda logging while the snippet also configured HTTP/S logging. Updated the description and comment.
- The CloudWatch Logs examples used a `/Failure` suffix in the SNS topic delivery log group name. Updated the log group name to the documented `sns/<region>/<account-id>/<topic-name>` format.
- The metric filter example looked for HTTP 408 as a timeout failure. SNS treats HTTP/S delivery failures according to endpoint response and retry behavior, and 4xx responses are not the right example for failed HTTP/S delivery attempts. Updated it to count HTTP 500 responses.
- The anomaly detection Terraform example set `return_data = true` on both metric queries. Updated the anomaly detection expression query to `return_data = false` so the metric is the watched time series and the anomaly band is referenced by `threshold_metric_id`.

## Review Notes
The AWS CLI and Terraform binaries were not installed in the local environment, so command validation was performed against official AWS CLI and Terraform provider documentation rather than local `--help` or `terraform validate`.
