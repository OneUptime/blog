# Validation Summary: How to Use CloudWatch Metric Streams to New Relic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Metric Streams
- Amazon Data Firehose / Kinesis Data Firehose
- AWS IAM
- Amazon S3
- AWS CLI
- AWS CloudFormation
- New Relic AWS CloudWatch Metric Streams integration
- NRQL

## Sources Consulted
- AWS CLI Command Reference: `cloudwatch put-metric-stream` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-stream.html
- AWS CloudFormation: `AWS::CloudWatch::MetricStream` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-metricstream.html
- AWS CloudFormation: `AWS::KinesisFirehose::DeliveryStream HttpEndpointDestinationConfiguration` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-kinesisfirehose-deliverystream-httpendpointdestinationconfiguration.html
- AWS CloudFormation: `AWS::KinesisFirehose::DeliveryStream HttpEndpointRequestConfiguration` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-kinesisfirehose-deliverystream-httpendpointrequestconfiguration.html
- AWS CloudFormation: `AWS::KinesisFirehose::DeliveryStream HttpEndpointConfiguration` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-kinesisfirehose-deliverystream-httpendpointconfiguration.html
- Amazon Data Firehose API Reference: `CreateDeliveryStream` and `HttpEndpointDestinationConfiguration` - https://docs.aws.amazon.com/firehose/latest/APIReference/API_CreateDeliveryStream.html
- Amazon Data Firehose Developer Guide: CloudWatch metrics for HTTP endpoint delivery - https://docs.aws.amazon.com/firehose/latest/dev/monitoring-with-cloudwatch-metrics.html
- Amazon CloudWatch User Guide: OpenTelemetry 1.0.0 metric stream output format - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-formats-opentelemetry-100.html
- New Relic documentation: Amazon CloudWatch Metric Streams - https://docs.newrelic.com/install/aws-cloudwatch/
- New Relic documentation: Work with AWS metrics data - https://docs.newrelic.com/docs/infrastructure/amazon-integrations/manage-aws-data/work-with-aws-metrics-data/
- New Relic documentation: No data appears: AWS CloudWatch metric streams - https://docs.newrelic.com/docs/infrastructure/amazon-integrations/troubleshooting/no-data-metric-streams/
- New Relic documentation: Amazon SageMaker integration endpoint references for CloudWatch Metric Streams - https://docs.newrelic.com/docs/mlops/integrations/aws-sagemaker-mlops-integration/

## Issues Found
- The CloudFormation template claimed to create the full pipeline but did not create the CloudWatch Metric Stream or the IAM role that allows CloudWatch Metric Streams to write to Firehose. Added `MetricStreamRole` and `AWS::CloudWatch::MetricStream` resources using the documented `FirehoseArn`, `RoleArn`, and `OutputFormat` properties.
- The CloudFormation Firehose HTTP endpoint configuration omitted settings used earlier in the guide and documented by AWS/New Relic: endpoint name, GZIP request encoding, failed-data-only S3 backup mode, and the Firehose role ARN. Added those fields to the template.
- The CloudFormation Firehose S3 IAM policy mixed bucket-level and object-level S3 permissions on a single object ARN. Split the policy into bucket-level permissions for `s3:GetBucketLocation` and `s3:ListBucket`, and object-level permissions for backup writes/reads.
- The troubleshooting section referenced `DeliveryToHttpEndpoint.Failures`, which is not a documented Amazon Data Firehose HTTP endpoint metric. Replaced it with the documented `DeliveryToHttpEndpoint.Success` Minimum-statistic check and `DeliveryToHttpEndpoint.DataFreshness`.

## Review Notes
The AWS CLI command shapes, CloudWatch Metric Stream `opentelemetry1.0` output format, New Relic US/EU CloudWatch Metric Streams endpoints, New Relic `collector.name = 'cloudwatch-metric-streams'` query filter, and recommendation to keep API polling for unsupported services such as AWS Health and Trusted Advisor were verified against official documentation.
