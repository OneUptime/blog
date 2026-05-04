# Validation Summary: How to Create AWS Kinesis Firehose with OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu / Terraform
- AWS Kinesis Data Firehose (Amazon Data Firehose)
- AWS Kinesis Data Streams
- AWS S3
- AWS OpenSearch
- AWS Lambda (Firehose data transformation)
- AWS IAM
- HashiCorp `hashicorp/aws` Terraform provider (`aws_kinesis_firehose_delivery_stream` resource)

## Sources Consulted
- Terraform AWS provider — `aws_kinesis_firehose_delivery_stream` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_firehose_delivery_stream
- Provider source markdown: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/kinesis_firehose_delivery_stream.html.markdown
- AWS Firehose API reference — `BufferingHints`: https://docs.aws.amazon.com/firehose/latest/APIReference/API_BufferingHints.html
- AWS Firehose API reference — `ExtendedS3DestinationConfiguration`: https://docs.aws.amazon.com/firehose/latest/APIReference/API_ExtendedS3DestinationConfiguration.html
- AWS Firehose dynamic partitioning docs: https://docs.aws.amazon.com/firehose/latest/dev/dynamic-partitioning.html
- AWS Firehose buffering docs: https://docs.aws.amazon.com/firehose/latest/dev/buffering.html

## Issues Found
- **`compression_format = "SNAPPY"` was invalid** in the "Kinesis Stream to Firehose" example. The AWS Firehose API documents `CompressionFormat` valid values as case-sensitive: `UNCOMPRESSED | GZIP | ZIP | Snappy | HADOOP_SNAPPY`. The Terraform AWS provider validates against the AWS SDK enum, so `"SNAPPY"` (all caps) would be rejected. Changed to `"Snappy"` to match the documented enum value.

All other technical content verified as correct:
- `aws_kinesis_firehose_delivery_stream` arguments (`name`, `destination`) and the `extended_s3_configuration`, `opensearch_configuration`, `kinesis_source_configuration`, `processing_configuration`, and `dynamic_partitioning_configuration` blocks match the current provider schema.
- Buffering attribute names are `buffering_size` and `buffering_interval` (not the older `buffer_size` / `buffer_interval`).
- The `min 64 / max 128` MB and `min 60 / max 900` s buffering comments are accurate for the dynamic-partitioning case used in that example (without dynamic partitioning, the API range is 1–128 MB and 0–900 s).
- `destination = "extended_s3"` and `destination = "opensearch"` are correct destination identifiers.
- `index_rotation_period = "OneDay"` is a valid value (alongside `NoRotation`, `OneHour`, `OneWeek`, `OneMonth`).
- `s3_backup_mode = "FailedDocumentsOnly"` is a valid value (alongside `AllDocuments`) for OpenSearch.
- Lambda processor parameter names (`LambdaArn`, `BufferSizeInMBs`, `BufferIntervalInSeconds`) are correct, as is the `${arn}:$LATEST` version-qualifier syntax.
- The `cloudwatch_logging_options` block fields and the IAM trust policy / inline policy structure are valid.

## Review Notes
- The post's description mentions Redshift as a destination, but the article does not include a Redshift example. This is a content gap rather than a technical error; per the review scope, no new sections were added.
- `dynamic_partitioning_configuration` also supports an optional `retry_duration` attribute (default 300 s) — not required, so omission is fine.
- For `extended_s3_configuration`, the `error_output_prefix` is required when dynamic partitioning is enabled; the first example correctly includes it.
- The `processing_configuration` parameter `BufferSizeInMBs = "1"` is at the minimum allowed value (1–3 MB range for Lambda buffering); this is fine but worth noting that smaller buffers mean more frequent Lambda invocations.
- The OpenSearch example relies on `aws_opensearch_domain.logs` and `aws_iam_role.firehose` being defined elsewhere — readers should ensure the IAM role's policy also grants OpenSearch permissions (e.g., `es:DescribeDomain`, `es:ESHttpPost`), which the IAM example here does not include.
