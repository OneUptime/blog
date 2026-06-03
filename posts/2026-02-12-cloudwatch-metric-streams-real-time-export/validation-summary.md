# Validation Summary: How to Use CloudWatch Metric Streams for Real-Time Export

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudWatch Metric Streams
- Amazon Data Firehose / Kinesis Data Firehose
- Amazon S3
- AWS IAM
- AWS CLI
- AWS CloudFormation
- OpenTelemetry

## Sources Consulted
- Amazon CloudWatch User Guide: Use metric streams: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Streams.html
- Amazon CloudWatch User Guide: Set up a metric stream: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-setup.html
- Amazon CloudWatch User Guide: Trust between CloudWatch and Firehose: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-trustpolicy.html
- Amazon CloudWatch User Guide: CloudWatch metric stream output in JSON format: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-formats-json.html
- Amazon CloudWatch User Guide: CloudWatch metric stream output in OpenTelemetry 1.0.0 format: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-formats-opentelemetry-100.html
- Amazon CloudWatch User Guide: Statistics that can be streamed: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-statistics.html
- AWS CLI Command Reference: cloudwatch put-metric-stream: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-stream.html
- AWS CLI Command Reference: cloudwatch stop-metric-streams: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/stop-metric-streams.html
- AWS CLI Command Reference: firehose create-delivery-stream: https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- AWS CloudFormation Reference: AWS::CloudWatch::MetricStream: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-metricstream.html
- AWS CloudFormation Reference: AWS::KinesisFirehose::DeliveryStream S3DestinationConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-kinesisfirehose-deliverystream-s3destinationconfiguration.html
- Amazon Data Firehose Developer Guide: Controlling access with Amazon Data Firehose: https://docs.aws.amazon.com/firehose/latest/dev/controlling-access.html
- Amazon CloudWatch Pricing: https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- The post said metrics arrive within 2-3 minutes unconditionally. AWS documents that metric stream data is sent every minute and expected destination latency depends on Firehose buffering, with about 3 minutes expected when buffering is at minimum values. Updated the latency wording.
- The setup created only a backup S3 bucket but the S3 Firehose example wrote to a separate data lake bucket. Added creation of the data lake bucket.
- JSON code blocks contained JavaScript-style comments, which are not valid JSON. Moved those labels outside the JSON snippets.
- The Firehose S3 permissions policy only covered the backup bucket and omitted several S3 actions used by Firehose. Updated the policy and CloudFormation role to cover the destination bucket and include the documented S3 actions.
- The post said Metric Streams support two output formats. AWS currently documents JSON, OpenTelemetry 1.0.0, and OpenTelemetry 0.7.0. Updated the text.
- The OpenTelemetry section implied generic OTLP-native compatibility. Clarified that the example uses the OpenTelemetry metric stream format through Firehose.
- The default statistics were described as min, max, sum, and count. Updated this to AWS's documented names: Minimum, Maximum, Sum, and SampleCount.
- The pricing section incorrectly stated that the first 1,000 metric updates per month are free. AWS's current pricing example bills metric stream updates at $0.003 per 1,000 updates in US East without that free tier. Updated the pricing text.
- The "When to Use" list repeated a fixed 2-3 minute latency claim. Replaced it with Firehose-buffering-dependent latency.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI flags were verified against the official AWS CLI command reference instead of local `aws --help` output.
