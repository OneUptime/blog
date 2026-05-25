# Validation Summary: How to Build a Log Aggregation Pipeline with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS CloudWatch Logs
- CloudWatch Logs subscription filters
- Amazon Data Firehose / Kinesis Data Firehose
- Amazon OpenSearch Service
- Amazon S3 lifecycle and encryption configuration
- AWS Lambda
- AWS IAM

## Sources Consulted
- AWS CloudWatch Logs subscription filters documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- AWS CloudWatch Logs PutSubscriptionFilter API reference: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutSubscriptionFilter.html
- Amazon Data Firehose documentation for sending CloudWatch Logs to Firehose: https://docs.aws.amazon.com/firehose/latest/dev/writing-with-cloudwatch-logs.html
- Amazon Data Firehose troubleshooting documentation for OpenSearch destinations: https://docs.aws.amazon.com/firehose/latest/dev/data-not-delivered-to-es.html
- Amazon Data Firehose CloudWatch Logs decompression documentation: https://docs.aws.amazon.com/firehose/latest/dev/writing-with-cloudwatch-logs-decompression.html
- Amazon Data Firehose destination configuration documentation: https://docs.aws.amazon.com/firehose/latest/dev/create-destination.html
- Amazon OpenSearch Service Terraform resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- Terraform AWS provider documentation for CloudWatch Logs destinations: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_destination
- AWS OpenSearch TLS policy announcement: https://aws.amazon.com/blogs/big-data/enhance-security-and-performance-with-tls-1-3-and-perfect-forward-secrecy-on-amazon-opensearch-service/

## Issues Found
- The original pipeline sent CloudWatch Logs subscription data to a Firehose stream configured with an OpenSearch destination. AWS documentation states that Firehose does not support delivering CloudWatch Logs records directly to Amazon OpenSearch Service because CloudWatch Logs can combine multiple log events into one Firehose record. I changed the Firehose example to use `extended_s3` for S3 archiving and added guidance to use the CloudWatch Logs OpenSearch subscription workflow or a Lambda consumer for OpenSearch indexing.
- The original Firehose example described S3 as a backup for OpenSearch delivery. After correcting the unsupported OpenSearch destination, I updated the Firehose snippet so S3 is the primary destination and removed OpenSearch-specific Firehose settings such as `opensearch_configuration`, index rotation, retry duration, and `s3_backup_mode`.
- The OpenSearch security group allowed ingress from a Firehose security group even though the corrected Firehose stream no longer delivers to OpenSearch. I removed the Firehose security group reference and left Grafana as the shown client.
- The Lambda transformer description said logs were normalized before reaching OpenSearch, but the corrected Firehose path archives to S3. I updated the description to say the transformer normalizes logs before archiving.
- The Index Lifecycle Management note implied Terraform support from "the Terraform OpenSearch provider" without naming that this is handled by OpenSearch community providers rather than the AWS provider. I clarified that ISM can be managed through the OpenSearch API and community Terraform providers.

## Review Notes
The snippets are still illustrative and omit supporting IAM permissions, CloudWatch log resource policies for OpenSearch log publishing, Lambda implementation details, and some production hardening. Those omissions are acceptable for the post's level, but a full deployable module would need those pieces.
