# Validation Summary: How to Design for Fault Tolerance on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS fault-tolerant architecture patterns
- AWS Lambda reserved concurrency
- AWS CDK
- Amazon SQS dead letter queues
- Amazon CloudWatch alarms
- AWS Fault Injection Service
- Amazon DynamoDB conditional writes, TTL, and global tables
- Amazon S3, Amazon RDS, and Amazon Aurora durability features
- JavaScript retry and circuit breaker patterns

## Sources Consulted
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CDK Lambda Runtime API reference: https://docs.aws.amazon.com/cdk/api/v2/dotnet/api/Amazon.CDK.AWS.Lambda.Runtime.html
- AWS Lambda reserved concurrency documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
- AWS CDK SQS Queue API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html
- AWS SDK for JavaScript v3 DynamoDB PutItemCommand reference: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/dynamodb-2012-08-10/PutItem
- DynamoDB TTL documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- AWS CDK DynamoDB module documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb-readme.html
- DynamoDB service overview and global tables documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html
- AWS Fault Injection Service actions documentation: https://docs.aws.amazon.com/fis/latest/userguide/action-sequence.html
- AWS CDK FIS CfnExperimentTemplate API reference: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_fis/CfnExperimentTemplate.html
- Amazon S3 FAQ durability documentation: https://aws.amazon.com/s3/faqs/
- Amazon RDS Multi-AZ documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- Amazon Aurora high availability documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html

## Issues Found
- The Lambda CDK examples used `lambda.Runtime.NODEJS_18_X`. AWS Lambda lists Node.js 18 as deprecated as of September 1, 2025, and the CDK API marks `NODEJS_18_X` deprecated. Changed both examples to `lambda.Runtime.NODEJS_24_X`.
- The chaos engineering section used the older "AWS Fault Injection Simulator" name. Current AWS documentation refers to the service as AWS Fault Injection Service. Updated the service name.
- The DynamoDB global table snippet used `new dynamodb.Table` with `replicationRegions`. Current AWS CDK documentation presents `TableV2` with `replicas` for global tables. Updated the snippet to `new dynamodb.TableV2`, `replicas`, and `dynamodb.Billing.onDemand()`.

## Review Notes
The JavaScript retry, circuit breaker, bulkhead, idempotency, SQS DLQ, FIS, and durability claims are directionally correct. The circuit breaker example is simplified for a blog post and should not be treated as a complete production library without adding concurrency controls, telemetry, and rolling-window failure tracking.
