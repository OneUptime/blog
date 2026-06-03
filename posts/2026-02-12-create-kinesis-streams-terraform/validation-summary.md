# Validation Summary: How to Create Kinesis Streams with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- AWS Identity and Access Management (IAM)
- AWS Key Management Service (AWS KMS)
- Amazon CloudWatch
- Amazon S3
- Terraform AWS provider
- Python boto3

## Sources Consulted
- AWS Kinesis Data Streams quotas and limits: https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- AWS Kinesis Data Streams capacity modes: https://docs.aws.amazon.com/streams/latest/dev/how-do-i-size-a-stream.html
- AWS Kinesis Data Streams shard capacity and stream creation: https://docs.aws.amazon.com/streams/latest/dev/working-with-streams.html
- AWS Kinesis Data Streams enhanced monitoring metrics: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_EnhancedMetrics.html
- AWS Kinesis Data Streams CloudWatch metrics: https://docs.aws.amazon.com/streams/latest/dev/monitoring-with-cloudwatch.html
- AWS Kinesis Data Streams enhanced fan-out: https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html
- AWS Kinesis Data Streams IAM actions and resource types: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonkinesisdatastreams.html
- AWS Kinesis Data Streams KMS permissions: https://docs.aws.amazon.com/streams/latest/dev/permissions-user-key-KMS.html
- AWS Kinesis Data Streams retention period: https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html
- AWS Kinesis Data Streams pricing: https://aws.amazon.com/kinesis/data-streams/pricing/
- Amazon SQS standard queue delivery semantics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html
- boto3 Kinesis PutRecords API: https://docs.aws.amazon.com/boto3/latest/reference/services/kinesis/client/put_records.html
- Terraform AWS provider aws_kinesis_stream resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_stream
- Terraform AWS provider aws_kinesis_stream_consumer resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_stream_consumer
- Terraform AWS provider aws_kinesis_firehose_delivery_stream resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_firehose_delivery_stream
- Amazon Data Firehose delivery behavior and destinations: https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html

## Issues Found
- The post described on-demand streams as starting with 4 shards and scaling up to 200 shards. AWS now documents on-demand capacity in throughput terms: new on-demand streams start with 4 MB/s write and 8 MB/s read throughput, and Kinesis manages capacity automatically. Updated the text accordingly.
- The on-demand pricing summary omitted the On-demand Standard per-stream hourly charge. Updated the sentence to include the per-stream charge while keeping the existing concise comparison.
- The post used the older "Kinesis Data Firehose" name. Updated prose and the section heading to the current "Amazon Data Firehose" name while leaving the Terraform resource name unchanged.
- The SQS comparison said "guaranteed delivery" without specifying the delivery model. Updated it to "at-least-once delivery" to match SQS standard queue semantics.
- The consumer IAM policy granted `kinesis:SubscribeToShard` on the stream ARN. AWS authorizes `SubscribeToShard` against registered consumer ARNs, so the policy now grants `DescribeStreamConsumer` and `SubscribeToShard` on the stream consumer ARN pattern.
- The KMS permissions in the producer and consumer examples were easy to misread because the provisioned stream used the AWS managed Kinesis key while the policies referenced a customer-managed key. Added comments clarifying that those KMS permissions are only needed when using a customer-managed KMS key.

## Review Notes
The Terraform and Python examples are illustrative snippets rather than a complete standalone module. A production module should also handle globally unique S3 bucket naming, SNS topic variable declaration, provider configuration, KMS key policy details for customer-managed keys, and IAM attachments to concrete roles or users.
