# Validation Summary: How to Create EventBridge Rules with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- Amazon EventBridge rules
- EventBridge schedules and cron expressions
- EventBridge custom event buses
- EventBridge archives and replay
- AWS Lambda
- Amazon SQS
- Amazon CloudWatch Logs
- AWS Step Functions
- AWS SDK for JavaScript v3
- AWS CodeDeploy and Amazon EC2 EventBridge events
- Cross-account EventBridge permissions

## Sources Consulted
- AWS CDK v2 `aws_events` module documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events-readme.html
- AWS CDK v2 `CronOptions` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.CronOptions.html
- AWS CDK v2 `Schedule` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Schedule.html
- AWS CDK v2 `LambdaFunction` target documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.LambdaFunction.html
- AWS CDK v2 `LambdaFunctionProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.LambdaFunctionProps.html
- AWS CDK v2 `SfnStateMachine` target documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.SfnStateMachine.html
- AWS CDK v2 archive properties documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.BaseArchiveProps.html
- Amazon EventBridge scheduled rule pattern documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Amazon EventBridge event bus concepts documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is-how-it-works-concepts.html
- Amazon EventBridge PutEvents request entry API documentation: https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEventsRequestEntry.html
- Amazon EventBridge PutEvents user guide: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-putevents.html
- Amazon EC2 instance state change event documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instance-state-changes.html
- Amazon EventBridge CodeDeploy events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-codedeploy.html
- AWS CodeDeploy CloudWatch Events monitoring documentation: https://docs.aws.amazon.com/codedeploy/latest/userguide/monitoring-cloudwatch-events.html

## Issues Found
- The cron expression note said undefined CDK cron fields default to wildcards. CDK documentation is more specific: absent fields imply `*` or `?`, whichever is appropriate. I updated the sentence to avoid implying that both day fields become `*`, which would be invalid for EventBridge cron expressions when both day-of-month and day-of-week are specified.

## Review Notes
The snippets are intentionally partial in several sections and assume variables such as `reportFunction`, `auditFunction`, `orderProcessor`, `welcomeEmailFn`, `createProfileFn`, and `definition` have been defined elsewhere. The CDK APIs and EventBridge event pattern fields used in the examples match current AWS CDK v2 and AWS documentation.
