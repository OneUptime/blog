# Validation Summary: Create Custom EventBridge Event Buses

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EventBridge custom event buses
- AWS CLI
- AWS SDK for JavaScript v3
- AWS SAM and AWS CloudFormation
- AWS Lambda
- Amazon SQS
- Amazon CloudWatch metrics
- IAM and EventBridge resource policies

## Sources Consulted
- Amazon EventBridge User Guide: Creating an event bus in Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-event-bus.html
- Amazon EventBridge User Guide: Permissions for event buses in Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus-perms.html
- Amazon EventBridge User Guide: Managing event bus permissions - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus-permissions-manage.html
- Amazon EventBridge API Reference: PutPermission - https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutPermission.html
- AWS CLI Command Reference: create-event-bus - https://docs.aws.amazon.com/cli/latest/reference/events/create-event-bus.html
- AWS CLI Command Reference: put-rule - https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CloudFormation Template Reference: AWS::Events::Rule - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-rule.html
- Amazon EventBridge API Reference: Target - https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_Target.html
- Amazon EventBridge User Guide: Event pattern syntax and numeric matching - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern.html
- AWS SDK for JavaScript v3: PutEventsCommand - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/eventbridge/command/PutEventsCommand/
- AWS SAM Developer Guide: AWS::Serverless::Function - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- Amazon EventBridge User Guide: Monitoring Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html

## Issues Found
- The JavaScript example used CommonJS `require()` with top-level `await`, which is not valid in a normal CommonJS `.js` file. Wrapped the usage examples in an async `example()` function and called it with `.catch(console.error)`.
- Several AWS account IDs in ARNs and principals were 9-digit placeholders. Updated them to valid 12-digit placeholder account IDs.
- The Lambda target CLI example added the target but did not grant EventBridge permission to invoke the Lambda function. Added the required `aws lambda add-permission` command with the custom-bus rule ARN.
- The `put-permission` example used a full policy document with `--policy`. Replaced it with the documented `--statement-id`, `--action`, and `--principal` form for granting a 12-digit account permission to call `events:PutEvents`.
- The SAM template's `AWS::Serverless::Function` did not include `CodeUri` or `InlineCode`, one of which is required for ZIP package functions. Added `CodeUri: high-value/`.
- The SAM template targeted Lambda from an `AWS::Events::Rule` but did not add `AWS::Lambda::Permission`. Added a permission resource scoped to `!GetAtt HighValueRule.Arn`.
- The monitoring section implied `PutEvents` metrics are per custom bus. Updated it to distinguish custom-bus rule metrics with the `EventBusName` dimension from account/Region-level `PutEventsFailedEntriesCount`.

## Review Notes
AWS CLI was not installed in the local environment, so CLI verification was performed against official AWS CLI and EventBridge documentation rather than local `aws ... help` output. The external OneUptime link is plausible and points to a related blog URL.
