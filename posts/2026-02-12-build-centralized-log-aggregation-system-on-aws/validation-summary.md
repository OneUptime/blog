# Validation Summary: How to Build a Centralized Log Aggregation System on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS CloudWatch Logs
- CloudWatch cross-account observability / Observability Access Manager
- Amazon Kinesis Data Streams
- Amazon Data Firehose / Kinesis Data Firehose
- Amazon OpenSearch Service
- OpenSearch Dashboards
- OpenSearch index templates and Index State Management
- AWS CDK v2
- AWS Lambda
- Amazon S3
- Amazon SNS

## Sources Consulted
- AWS CDK `aws_logs.CrossAccountDestination`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.CrossAccountDestination.html
- AWS CDK `aws_kinesisfirehose.CfnDeliveryStream.AmazonopensearchserviceDestinationConfigurationProperty`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_kinesisfirehose.CfnDeliveryStream.AmazonopensearchserviceDestinationConfigurationProperty.html
- AWS CloudFormation `AWS::Logs::SubscriptionFilter`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-logs-subscriptionfilter.html
- Amazon CloudWatch Logs subscription filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- Amazon Data Firehose Lambda transformation output requirements: https://docs.aws.amazon.com/firehose/latest/dev/data-transformation-status-model.html
- AWS CLI `oam put-sink-policy`: https://docs.aws.amazon.com/cli/latest/reference/oam/put-sink-policy.html
- AWS CLI `oam create-link`: https://docs.aws.amazon.com/cli/latest/reference/oam/create-link.html
- Amazon OpenSearch Service Index State Management: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html
- OpenSearch index templates: https://docs.opensearch.org/docs/latest/api-reference/index-apis/create-index-template/
- OneUptime companion guide URL: https://oneuptime.com/blog/post/2026-02-12-build-logging-and-monitoring-stack-on-aws/view

## Issues Found
- Replaced "Kibana dashboards" with "OpenSearch Dashboards" because current Amazon OpenSearch Service uses OpenSearch Dashboards terminology.
- Added the missing `aws-ec2` CDK import needed by `ec2.EbsDeviceVolumeType.GP3` in the OpenSearch domain example.
- Added Firehose `processingConfiguration` for the Lambda processor so the transformation Lambda is actually invoked before delivery to OpenSearch.
- Corrected the cross-account CloudWatch Logs subscription example. The original code created a `CrossAccountDestination` but then subscribed with an undefined `centralStream` and `KinesisDestination`, which is not the correct cross-account shape. The updated version creates a destination policy and uses `CfnSubscriptionFilter` with the logical destination ARN.
- Removed Elasticsearch ILM settings from the OpenSearch index template. The post targets OpenSearch, so retention now uses an OpenSearch ISM policy instead.
- Replaced the Elasticsearch-style lifecycle policy JSON with a valid OpenSearch ISM policy that applies to `logs-*` indexes and deletes them after 30 days.
- Replaced the incorrect `aws cloudwatch put-metric-data-account-policy` command with CloudWatch Observability Access Manager `aws oam create-sink`, `put-sink-policy`, and `create-link` commands for cross-account observability.

## Review Notes
- Several snippets still assume surrounding IAM roles and permissions exist, such as `firehoseRole`, `destinationRole`, and permission for Firehose to invoke the transform Lambda. That is acceptable for a blog-level example, but a production-ready CDK stack should define those roles explicitly.
- The OpenSearch ISM policy intentionally avoids rollover because the Firehose example already uses daily index rotation.
