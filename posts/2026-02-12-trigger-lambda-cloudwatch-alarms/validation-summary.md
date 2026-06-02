# Validation Summary: How to Trigger Lambda Functions from CloudWatch Alarms

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudWatch Alarms
- AWS Lambda
- Amazon SNS
- Amazon EventBridge
- AWS CDK v2
- AWS SDK for JavaScript v3
- Amazon EC2 Auto Scaling
- Amazon ECS
- DynamoDB remediation tracking pattern

## Sources Consulted
- Amazon CloudWatch: Alarm events and EventBridge: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-and-eventbridge.html
- Amazon EventBridge: Amazon CloudWatch events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-cloudwatch.html
- Amazon EventBridge: Event pattern syntax: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern.html
- Amazon EventBridge: Content filtering and prefix matching: https://docs.aws.amazon.com/eventbridge/latest/userguide/content-filtering-with-event-patterns.html
- Amazon CloudWatch: Alarm actions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html
- Amazon CloudWatch: Invoke a Lambda function from an alarm: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-actions-Lambda.html
- AWS CDK v2: aws-cloudwatch-actions module: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch_actions-readme.html
- AWS CDK v2: LambdaAction: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_cloudwatch_actions/LambdaAction.html
- AWS CDK v2: MathExpression: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_cloudwatch/MathExpression.html
- AWS Lambda: Invoking Lambda functions with Amazon SNS notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- AWS SDK for JavaScript v3: ECS UpdateServiceCommand: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/ecs-2014-11-13/UpdateService
- OneUptime linked article URL checked: https://oneuptime.com/blog/post/2026-02-12-debug-lambda-functions-cloudwatch-logs/view

## Issues Found
- The post said there are only two ways to trigger Lambda from CloudWatch Alarms and described EventBridge as direct triggering. CloudWatch now supports Lambda as a direct alarm action, while EventBridge is a routing path. Updated the wording to say the post covers two common routing approaches and explicitly noted direct Lambda alarm actions.
- The remediation handler called `extractInstanceId(alarmData)` but did not define that function. Added an implementation that can read EC2 instance dimensions from both CloudWatch alarm SNS payloads and EventBridge alarm state change payloads.
- The remediation handler could dereference `alarmData` when receiving an unsupported event source. Added an unsupported-source guard before state checks.
- The EventBridge alarm event example omitted the top-level `resources` field shown in AWS's documented CloudWatch alarm state change event shape. Added a representative alarm ARN.

## Review Notes
- The CDK snippets use current AWS CDK v2 module names and valid `Alarm`, `SnsAction`, `LambdaSubscription`, `Rule`, `LambdaFunction`, `Metric`, and `MathExpression` APIs.
- The EventBridge event pattern uses the CDK `detailType` property, which maps to EventBridge's `detail-type` event field, and the `prefix` matcher is valid for string matching.
- The AWS SDK for JavaScript v3 command names and request fields used in the examples are current.
- The Lambda error-rate math expression is technically valid, but production alarms often add missing-data handling or math guards for low/no invocation periods.
