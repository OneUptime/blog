# Validation Summary: How to Monitor AWS S3, DynamoDB, and SQS with OpenTelemetry

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib `awscloudwatch` receiver
- OpenTelemetry OTLP receiver and OTLP HTTP exporter
- AWS CloudWatch metrics
- Amazon S3 request metrics
- Amazon DynamoDB CloudWatch metrics
- Amazon SQS CloudWatch metrics
- Python boto3 and botocore instrumentation
- IAM policies for CloudWatch metric collection

## Sources Consulted
- OpenTelemetry Collector Contrib AWS CloudWatch receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/awscloudwatchreceiver/README.md
- OpenTelemetry Collector receiver registry: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Python Contrib botocore instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/botocore/botocore.html
- OpenTelemetry Python Contrib botocore instrumentation source documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/botocore.html
- Amazon S3 CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Amazon DynamoDB metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- Amazon SQS available CloudWatch metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The `awscloudwatch` receiver examples used an incorrect metrics configuration shape: `poll_interval`, `metrics.named`, per-metric map keys, `statistics`, and list-based dimensions. Updated the examples to the current receiver format using `metrics.collection_interval`, `period`, `delay`, `queries`, `stats`, and dimension maps.
- The DynamoDB `ThrottledRequests` example omitted the `Operation` dimension even though AWS documents `ThrottledRequests` with `TableName, Operation` dimensions. Added `Operation: GetItem` to match the rest of the example.
- The IAM policy was described as minimal but included `cloudwatch:GetMetricStatistics`, while the documented receiver metrics path uses `GetMetricData` and optional `ListMetrics` for discovery. Removed `GetMetricStatistics`.
- The botocore instrumentation text said spans include request parameters by default. Updated the wording to describe the default botocore-specific attributes and note that request hooks can add selected request parameters.
- The SQS received/deleted metric explanation treated the difference as a direct failure count. Updated it to explain that it is an operational signal because SQS metrics can include repeated receives and repeated deletes.

## Review Notes
The `awscloudwatch` receiver is currently marked alpha in OpenTelemetry Collector Contrib. The examples are valid for the current documented configuration, but production users should pin and test a specific collector-contrib or ADOT version.
