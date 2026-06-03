# Validation Summary: How to Build a Batch Data Processing Pipeline on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- AWS Lambda
- Amazon S3
- Amazon EventBridge scheduled rules
- Amazon SNS
- Amazon DynamoDB
- AWS SDK for JavaScript v3
- AWS CLI
- Mermaid diagrams

## Sources Consulted
- AWS CLI S3 commands documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html
- AWS CLI put-bucket-lifecycle-configuration reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Amazon S3 Lifecycle configuration documentation: https://docs.aws.amazon.com/AmazonS3/latest/dev/how-to-set-lifecycle-configuration-intro.html
- AWS SDK for JavaScript v3 S3 GetObjectCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/
- AWS Step Functions Lambda integration documentation: https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions SNS integration documentation: https://docs.aws.amazon.com/step-functions/latest/dg/connect-sns.html
- AWS Step Functions error handling documentation: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- Amazon EventBridge scheduled rule documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- Amazon EventBridge input transformer documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-input-rule.html
- Amazon EventBridge PutTargets API reference: https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutTargets.html
- Amazon DynamoDB BatchWriteItem API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html

## Issues Found
- The post description mentioned AWS Glue, but the tutorial does not configure or use Glue. Changed the description to mention DynamoDB instead.
- The architecture diagram showed a notification Lambda, while the Step Functions definition publishes directly to SNS with the optimized SNS service integration. Updated the diagram to show direct SNS notification.
- The extract Lambda accepted a scheduled timestamp as `date` but did not normalize it to a `YYYY-MM-DD` processing date. Updated the code to parse the supplied date and use the ISO date portion.
- The transform Lambda divided by zero when all records were filtered out, producing a non-useful average. Updated `averageValue` to return `0` for an empty transformed set.
- The load Lambda used DynamoDB batch writes but ignored `UnprocessedItems`. Updated the sample to retry unprocessed batch write requests with exponential backoff.
- The Step Functions section claimed parallel execution, but the provided state machine is sequential and does not use a `Parallel` state. Changed the wording to "error handling."
- The EventBridge target input used `<aws.scheduler.current-date>`, which is not valid for EventBridge scheduled rules and is not the documented Scheduler scheduled-time variable. Replaced it with an EventBridge rule `InputTransformer` that passes the scheduled event's `$.time` field to Step Functions.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI validation was performed against official AWS CLI and service documentation.
- JavaScript code snippets were checked with `node --check` on Node.js v22.22.0.
- The Step Functions Lambda tasks use direct Lambda function ARNs, which is still a supported invocation pattern. Newer examples often use the optimized `arn:aws:states:::lambda:invoke` integration when metadata such as `StatusCode` or callback patterns are needed.
