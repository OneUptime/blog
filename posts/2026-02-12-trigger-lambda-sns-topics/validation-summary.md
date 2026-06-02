# Validation Summary: How to Trigger Lambda Functions from SNS Topics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SNS
- AWS Lambda
- Amazon SQS
- AWS CDK v2
- AWS CLI
- AWS SDK for JavaScript v3
- Node.js

## Sources Consulted
- AWS Lambda: Invoking Lambda functions with Amazon SNS notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- AWS Lambda: Configuring error handling settings for Lambda asynchronous invocations: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-configuring.html
- Amazon SNS: Message delivery retries: https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
- Amazon SNS: Message delivery for FIFO topics: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-delivery.html
- Amazon SNS: Message attributes: https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html
- AWS CDK v2: LambdaSubscription API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.LambdaSubscription.html
- AWS CDK v2: LambdaSubscriptionProps API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.LambdaSubscriptionProps.html
- AWS SDK for JavaScript v3: SNS PublishCommand: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/sns-2010-03-31/Publish

## Issues Found
- The SNS publishing example used top-level `await` in a CommonJS snippet that imports with `require()`. I wrapped the usage example in an async Lambda handler so the JavaScript is syntactically valid.
- The high-value-order CDK filter example used `filterPolicyScope`, which is not a property of `LambdaSubscriptionProps`, and it did not actually filter on order value. I changed it to use `filterPolicy` with `sns.SubscriptionFilter.numericFilter()` and added a numeric `total` SNS message attribute to the publishing example.
- The error handling section claimed Lambda SNS delivery policies default to 3 retries and can be customized with `DeliveryPolicy`. AWS documentation states custom SNS delivery policies are only supported for HTTP/S endpoints, while Lambda is an AWS managed endpoint with an AWS-defined delivery policy. I replaced the CLI example and clarified the separate SNS delivery retry path and Lambda asynchronous processing retry path.
- The retry sequencing implied Lambda retries begin after SNS exhausts delivery retries. I corrected this: SNS retries delivery failures before Lambda accepts the event, and Lambda retries function processing failures after the async event is accepted.

## Review Notes
The post is technically accurate after the corrections. The Lambda DLQ example is valid for discarded asynchronous Lambda invocations; teams that need to capture SNS delivery failures before Lambda accepts an event should also consider an SNS subscription dead-letter queue.
