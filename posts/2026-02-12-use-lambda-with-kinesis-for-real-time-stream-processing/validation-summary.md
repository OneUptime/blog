# Validation Summary: How to Use Lambda with Kinesis for Real-Time Stream Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon Kinesis Data Streams
- AWS CLI
- Python
- Boto3
- Amazon CloudWatch metrics
- Amazon SQS on-failure destination

## Sources Consulted
- AWS Lambda Developer Guide: Using Lambda to process records from Amazon Kinesis Data Streams - https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
- AWS Lambda Developer Guide: Configuring partial batch response with Kinesis Data Streams and Lambda - https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-batchfailurereporting.html
- AWS Lambda Developer Guide: Lambda parameters for Amazon Kinesis Data Streams event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html
- Amazon Kinesis Data Streams Developer Guide: Quotas and limits - https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- Amazon Kinesis Data Streams Developer Guide: Terminology and concepts - https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html
- AWS Lambda Developer Guide: Types of metrics for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS CLI Command Reference: kinesis create-stream - https://docs.aws.amazon.com/cli/latest/reference/kinesis/create-stream.html
- AWS CLI Command Reference: lambda create-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- Amazon Kinesis Data Streams Pricing - https://aws.amazon.com/kinesis/data-streams/pricing/

## Issues Found
- The original Lambda handler collected all failed Kinesis records and continued processing later records in the same batch. For Kinesis stream partial batch responses, Lambda uses the lowest failed sequence number as the checkpoint and retries from there, so continuing after the first failure can cause later successful records to be processed again. Updated the handler to return the first failed sequence number immediately.
- The post said Lambda retries only the failed records with `batchItemFailures`. For Kinesis streams, Lambda retries from the failed sequence number checkpoint rather than guaranteeing only the individual failed records are retried. Updated the wording to match AWS Lambda stream checkpointing behavior.
- The scaling section said increasing `parallelization-factor` can make records within a shard process out of order. AWS documents that Lambda still preserves order at the partition-key level. Updated the wording to clarify that records with different partition keys can be processed in parallel while partition-key order is preserved.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI flags were verified against official AWS CLI documentation rather than local `aws help` output. Python code blocks were parsed with Python's AST parser and are syntactically valid.
