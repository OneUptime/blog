# Validation Summary: Integrate Step Functions with AWS Services Directly

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Step Functions
- AWS service integrations and AWS SDK integrations
- Amazon DynamoDB
- Amazon SQS
- Amazon SNS
- Amazon EventBridge
- AWS Glue
- Amazon ECS / AWS Fargate
- AWS IAM
- JavaScript AWS SDK v3

## Sources Consulted
- AWS Step Functions: Integrating services with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-service-integrations.html
- AWS Step Functions: Discover service integration patterns - https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html
- AWS Step Functions: Perform DynamoDB CRUD operations with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-ddb.html
- AWS Step Functions: Publish messages to an Amazon SNS topic with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-sns.html
- AWS Step Functions: Add EventBridge events with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-eventbridge.html
- AWS Step Functions: Start an AWS Glue job with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-glue.html
- AWS Step Functions: Run Amazon ECS or Fargate tasks with Step Functions - https://docs.aws.amazon.com/en_us/step-functions/latest/dg/connect-ecs.html
- AWS Step Functions: Learning to use AWS service SDK integrations - https://docs.aws.amazon.com/step-functions/latest/dg/supported-services-awssdk.html
- AWS CLI SQS send-message reference - https://docs.aws.amazon.com/cli/latest/reference/sqs/send-message.html

## Issues Found
- The introduction described all direct service calls as "SDK integration." Step Functions documentation distinguishes AWS SDK integrations from optimized service integrations, so this was changed to "service integration."
- The DynamoDB section said the example "queries" DynamoDB, but the code uses the optimized `dynamodb:getItem` integration. This was changed to "read from DynamoDB" to avoid implying the DynamoDB `Query` API.
- The Glue example used `arn:aws:states:::aws-sdk:glue:startJobRun.sync`. AWS documentation states `.sync` is not supported for generic AWS SDK integrations, while the optimized Glue integration supports `arn:aws:states:::glue:startJobRun.sync`. The ARN and surrounding explanation were corrected.
- The IAM policy for the complete workflow granted both `dynamodb:PutItem` and `dynamodb:GetItem`, but that workflow only writes to the `Orders` table. The policy was changed to grant only `dynamodb:PutItem`, matching the least-privilege guidance in the post.

## Review Notes
The examples use the JSONPath-era `Parameters` field rather than the newer JSONata `Arguments` examples shown in some current AWS documentation. `Parameters` remains valid for JSONPath-based Amazon States Language definitions.
