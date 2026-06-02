# Validation Summary: How to Create Step Functions State Machines with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- AWS CDK v2
- TypeScript
- AWS Lambda
- Amazon DynamoDB
- Amazon SNS
- Amazon CloudWatch Logs
- Amazon EventBridge
- Amazon SQS

## Sources Consulted
- AWS CDK API Reference: StateMachine construct - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.StateMachine.html
- AWS CDK API Reference: LambdaInvokeProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions_tasks.LambdaInvokeProps.html
- AWS CDK API Reference: Timeout - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.Timeout.html
- AWS CDK API Reference: Wait and WaitTime - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.Wait.html and https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.WaitTime.html
- AWS CDK API Reference: Condition - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.Condition.html
- AWS CDK API Reference: JsonPath - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.JsonPath.html
- AWS CDK API Reference: DynamoAttributeValue - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions_tasks.DynamoAttributeValue.html
- AWS CDK Step Functions tasks README: Lambda callback task token pattern and Lambda service retries - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions_tasks-readme.html
- AWS Step Functions Developer Guide: Standard and Express workflow types - https://docs.aws.amazon.com/step-functions/latest/dg/sfn-prerequisites.html
- AWS Step Functions Developer Guide: Callback with task token integration pattern - https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html
- AWS Step Functions API Reference: SendTaskSuccess - https://docs.aws.amazon.com/step-functions/latest/apireference/API_SendTaskSuccess.html

## Issues Found
- The callback Lambda task used the deprecated `timeout` property. Changed it to `taskTimeout: sfn.Timeout.duration(cdk.Duration.days(7))`, which matches the current CDK v2 API guidance.
- The direct service integration section said there are "no execution costs." Direct integrations avoid Lambda execution costs, but Step Functions execution charges and downstream service charges can still apply. Updated the wording to "no Lambda execution costs."
- The Express workflow comparison said Express workflows are broadly "cheaper and faster." AWS documents different pricing models and execution semantics rather than a universal cost advantage. Updated the wording to say Express workflows are designed for high-volume, short-duration workloads.

## Review Notes
The remaining CDK examples use current v2 constructs such as `definitionBody`, `DefinitionBody.fromChainable`, `LambdaInvoke`, `Choice`, `Condition`, `Parallel`, `WaitTime`, `DynamoPutItem`, `SnsPublish`, and `StateMachineType.EXPRESS`. Several snippets are illustrative and depend on surrounding variables such as Lambda functions being defined elsewhere.
