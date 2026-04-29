# Validation Summary: How to Build a Log Aggregation Pipeline with OpenTofu

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS CloudWatch Logs
- Amazon Data Firehose
- Amazon OpenSearch Service
- Amazon S3
- AWS Lambda
- AWS IAM

## Sources Consulted
- Amazon Data Firehose Developer Guide, "Send CloudWatch Logs to Firehose": https://docs.aws.amazon.com/firehose/latest/dev/writing-with-cloudwatch-logs.html
- AWS CLI Command Reference, `put-subscription-filter`: https://docs.aws.amazon.com/cli/latest/reference/logs/put-subscription-filter.html
- Amazon CloudWatch Logs User Guide, "Streaming CloudWatch Logs data to Amazon OpenSearch Service": https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_OpenSearch_Stream.html
- Amazon OpenSearch Service Developer Guide, "Loading streaming data from Amazon CloudWatch": https://docs.aws.amazon.com/opensearch-service/latest/developerguide/integrations-cloudwatch.html
- Amazon CloudWatch Logs User Guide, "Log group-level subscription filters": https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- Terraform AWS provider docs, `aws_kinesis_firehose_delivery_stream`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kinesis_firehose_delivery_stream.html.markdown
- Terraform AWS provider docs, `aws_cloudwatch_log_subscription_filter`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_subscription_filter.html.markdown
- Terraform AWS provider docs, `aws_opensearch_domain`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/opensearch_domain.html.markdown

## Issues Found
- The post's core architecture is unsupported as written. AWS documents that CloudWatch Logs events sent to Firehose are gzip-compressed and explicitly states that Firehose does not support delivering CloudWatch Logs to an Amazon OpenSearch Service destination, because CloudWatch combines multiple log events into one Firehose record and OpenSearch cannot accept multiple log events in one record.
- The `aws_cloudwatch_log_subscription_filter` shown in the post only sends the log group to Firehose. Per the AWS `put-subscription-filter` API and CLI docs, the supported destinations are same-account Kinesis Data Streams, same-account Firehose, same-account Lambda, or cross-account logical destinations. The resource shown here does not create the supported CloudWatch Logs to OpenSearch ingestion path.
- AWS's documented CloudWatch Logs to OpenSearch flow is a different design from the one in this post. The official OpenSearch streaming guide uses a CloudWatch Logs subscription to OpenSearch that requires a Lambda execution role as part of the setup, not a Firehose delivery stream with `destination = "opensearch"` receiving CloudWatch Logs directly.
- Because the title, introduction, Firehose section, subscription filter section, Lambda section, and summary are all built around the unsupported CloudWatch Logs -> Firehose -> OpenSearch path, the article would need a substantive rewrite to become accurate. I did not patch `README.md`; I marked the post `not-technically-relevant` for removal instead.

## Review Notes
- Some individual snippets are plausible in isolation, such as the S3 lifecycle configuration and the OpenSearch domain resource, but they do not make the end-to-end pipeline described by the post work on AWS as documented today.
- The post also uses the older service name "Kinesis Data Firehose"; AWS renamed the service to "Amazon Data Firehose" in February 2024. That naming issue is secondary to the architectural error above.
