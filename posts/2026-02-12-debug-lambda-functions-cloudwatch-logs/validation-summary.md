# Validation Summary: How to Debug Lambda Functions with CloudWatch Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- CloudWatch metric filters and alarms
- AWS CLI
- AWS CDK v2
- Node.js Lambda handlers
- Amazon SQS message attributes
- Powertools for AWS Lambda (TypeScript/JavaScript Logger)

## Sources Consulted
- AWS Lambda: Sending Lambda function logs to CloudWatch Logs: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html
- AWS Lambda: Configuring CloudWatch log groups: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-loggroups.html
- AWS Lambda: Viewing CloudWatch logs for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-view.html
- AWS Lambda: Understanding the execution environment lifecycle and timeout log examples: https://docs.aws.amazon.com/lambda/latest/dg/running-lambda-code.html
- Amazon CloudWatch Logs: Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Amazon CloudWatch Logs: parse command syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Parse.html
- Amazon CloudWatch Logs: Filter pattern syntax for metric filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntaxForMetricFilters.html
- AWS CLI: logs put-retention-policy: https://docs.aws.amazon.com/cli/latest/reference/logs/put-retention-policy.html
- AWS CDK v2: aws_logs.FilterPattern API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.FilterPattern.html
- AWS CDK v2: Lambda function logging and logRetention deprecation notes: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html
- Powertools for AWS Lambda TypeScript Logger: https://docs.powertools.aws.dev/lambda/typescript/latest/features/logger/

## Issues Found
- The post said every Lambda function automatically gets a `/aws/lambda/function-name` log group. Updated this to state that this is the default, because Lambda now supports configured custom log groups.
- The post described console methods as mapping directly to CloudWatch log levels. Updated the wording because Lambda can assign levels to console output when structured JSON logging is enabled, while CloudWatch Logs itself stores log events rather than native per-event log levels.
- The CDK metric filters used raw literal text patterns for JSON logs. Updated them to `logs.FilterPattern.stringValue(...)`, which generates proper JSON filter patterns for the structured log fields.
- The CDK alarm snippet imported `aws-cloudwatch-actions` and `aws-sns` but did not use them. Removed the unused imports so the snippet remains clean and compilable under stricter TypeScript settings.
- The log retention CDK snippet used the legacy/deprecated `logRetention` Lambda property. Updated it to create a `logs.LogGroup` with a retention policy and pass it through the Lambda `logGroup` property.
- The timeout section said timeouts produce no error and the REPORT duration equals the configured timeout. Updated it to say the function receives no catchable error, Lambda emits a timeout message, and the REPORT duration is near the configured timeout.
- The cold-start advice recommended moving initialization code outside the handler. Refined this because reusable clients should generally stay outside the handler for warm reuse, while nonessential initialization should be lazy-loaded to reduce cold-start work.

## Review Notes
The examples are otherwise technically sound. The API Gateway source IP example uses the REST API event shape; HTTP API v2 events use a different path (`requestContext.http.sourceIp`), but the existing example is valid for REST API events.
