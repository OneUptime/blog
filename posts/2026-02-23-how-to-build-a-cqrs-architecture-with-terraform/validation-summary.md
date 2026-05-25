# Validation Summary: How to Build a CQRS Architecture with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Terraform
- AWS DynamoDB and DynamoDB Streams
- AWS Lambda
- Amazon API Gateway HTTP APIs
- Amazon Kinesis Data Streams
- Amazon OpenSearch Service
- Amazon SQS
- Amazon CloudWatch
- CQRS and event sourcing architecture

## Sources Consulted
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda event source mapping API: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- AWS Lambda Kinesis on-failure destinations: https://docs.aws.amazon.com/lambda/latest/dg/kinesis-on-failure-destination.html
- AWS DynamoDB Streams documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
- AWS DynamoDB StreamSpecification API: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_StreamSpecification.html
- AWS DynamoDB point-in-time recovery documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- Amazon OpenSearch Service documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html
- Amazon OpenSearch Service supported versions: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/direct-query-limitations.html
- Terraform AWS provider aws_opensearch_domain resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- Terraform AWS provider aws_lambda_event_source_mapping resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS provider aws_sqs_queue resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- AWS SQS CloudWatch metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html

## Issues Found
- The Lambda examples used `nodejs20.x`, which AWS lists as deprecated as of April 30, 2026. Updated all Lambda snippets to `nodejs24.x`, which is currently supported.
- The post described the read store as Elasticsearch while the Terraform creates an Amazon OpenSearch Service domain with `engine_version = "OpenSearch_2.11"`. Updated the text and environment variable names to use OpenSearch consistently.
- The DLQ section said failed projections are captured, but the Kinesis-to-projector event source mapping did not configure an on-failure destination. Added `destination_config` with the SQS DLQ and enabled `bisect_batch_on_function_error` for the projector mapping.

## Review Notes
The Terraform snippets are representative rather than a complete deployable module; several referenced resources and IAM permissions are implied but not shown, including Lambda integrations, authorizers, security groups, and execution policies. OpenSearch 2.11 remains supported by Amazon OpenSearch Service, though newer OpenSearch versions are available.
