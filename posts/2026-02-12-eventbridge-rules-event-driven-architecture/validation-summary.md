# Validation Summary: Set Up EventBridge Rules for Event-Driven Architecture

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EventBridge rules and event buses
- EventBridge event patterns and comparison operators
- AWS CLI for EventBridge and Lambda
- AWS SDK for JavaScript v3
- AWS Lambda
- Amazon SQS
- AWS Step Functions
- AWS Serverless Application Model (SAM)

## Sources Consulted
- Amazon EventBridge documentation: https://docs.aws.amazon.com/eventbridge/
- Amazon EventBridge event pattern syntax: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern.html
- Amazon EventBridge comparison operators: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- Amazon EventBridge targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- Amazon EventBridge input transformation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html
- AWS CLI `events put-rule`: https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI `events put-targets`: https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- AWS CLI `events test-event-pattern`: https://docs.aws.amazon.com/cli/latest/reference/events/test-event-pattern.html
- AWS CLI `lambda add-permission`: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS SDK for JavaScript v3 `PutEventsCommand`: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/eventbridge/command/PutEventsCommand/
- AWS SAM `AWS::Serverless::Function`: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM `EventBridgeRule`: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-eventbridgerule.html
- AWS SAM policy templates: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html

## Issues Found
- Several example ARNs used a 9-digit placeholder account ID (`123456789`). AWS account IDs in ARNs are 12 digits, so these were changed to `123456789012`.
- The `test-event-pattern` example event omitted fields the AWS CLI documentation lists as mandatory for the test event: `id`, `account`, `time`, `region`, and `resources`. These fields were added to the sample event.
- The SAM example was described as complete, but the zip-based `AWS::Serverless::Function` resources did not include `CodeUri` or `InlineCode`. Added representative `CodeUri` values for each function so the template shape is deployable with external function code.

## Review Notes
The examples are otherwise consistent with current EventBridge rule, target, event pattern, input transformer, schedule expression, Lambda permission, AWS SDK for JavaScript v3, and AWS SAM documentation. The AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI reference.
