# Validation Summary: How to Use CloudWatch Metric Streams to Datadog

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Metric Streams
- Amazon Data Firehose / Kinesis Data Firehose
- AWS CLI
- AWS IAM
- Amazon S3
- Datadog AWS integration
- OpenTelemetry metric stream output

## Sources Consulted
- AWS CloudWatch Metric Streams user guide: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Streams.html
- AWS CloudWatch custom setup with Firehose: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-setup-datalake.html
- AWS CloudWatch Metric Streams setup and latency notes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-setup.html
- AWS CloudWatch trust policy for Firehose: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-metric-streams-trustpolicy.html
- AWS CLI `put-metric-stream` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-stream.html
- AWS CLI `create-delivery-stream` reference: https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- Amazon Data Firehose `CreateDeliveryStream` API reference: https://docs.aws.amazon.com/firehose/latest/APIReference/API_CreateDeliveryStream.html
- Datadog AWS CloudWatch Metric Streams with Amazon Data Firehose guide: https://docs.datadoghq.com/integrations/guide/aws-cloudwatch-metric-streams-with-kinesis-data-firehose/
- AWS CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- The post instructed readers to append `?dd-api-key=YOUR_API_KEY` to the Firehose endpoint URL. For Firehose HTTP endpoint destinations, the Datadog API key should be provided through the endpoint `AccessKey` configuration. Updated the text to match the AWS Firehose configuration used in the CLI example.
- The Firehose trust policy snippet was marked as JSON but included a `//` comment, which would make the saved policy invalid JSON. Moved the comment into prose before the snippet.
- The post said Datadog users should disable CloudWatch polling for streamed namespaces. Datadog's current guidance says to leave the AWS integration configuration unchanged; Datadog automatically detects streamed namespaces and stops polling those metrics while continuing to use polling for metadata and unsupported delayed metrics. Updated Step 8 accordingly.
- The intro implied Metric Streams lower overall CloudWatch bills. AWS and Datadog both note Metric Streams and Firehose have their own usage charges, so updated the wording to say Metric Streams reduce API polling and require separate cost estimation.
- The Datadog/OpenTelemetry wording was tightened to state that Datadog supports OpenTelemetry output format and CloudWatch Metric Streams `opentelemetry1.0` is the latest OpenTelemetry output format.

## Review Notes
- AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference instead of local `aws --help` output.
- The article lists common Datadog sites for metric intake endpoints but does not include every Datadog site shown in Datadog's site selector, such as AP1, AP2, or GovCloud. This is not a correctness issue for the listed endpoints, but a future update could make the table more comprehensive.
