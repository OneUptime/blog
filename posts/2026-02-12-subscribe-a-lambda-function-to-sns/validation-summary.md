# Validation Summary: How to Subscribe a Lambda Function to SNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SNS
- AWS Lambda
- AWS CLI
- AWS CDK
- Amazon SQS dead letter queues
- Python
- Node.js
- boto3

## Sources Consulted
- AWS Lambda: Invoking Lambda functions with Amazon SNS notifications: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
- AWS CLI: `aws sns subscribe`: https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html
- Amazon SNS message delivery retries: https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
- Amazon SNS dead-letter queues: https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html
- Amazon SNS DLQ configuration: https://docs.aws.amazon.com/sns/latest/dg/sns-configure-dead-letter-queue.html
- AWS Lambda asynchronous invocation error handling: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-configuring.html
- AWS Lambda asynchronous invocation destinations and DLQs: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- Amazon SNS message filtering: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
- Amazon SNS subscription filter policies: https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html
- AWS CDK `LambdaSubscriptionProps`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.LambdaSubscriptionProps.html

## Issues Found
- The post said SNS retries when Lambda function code throws an error and retries up to 3 times. That conflated SNS delivery retries with Lambda asynchronous invocation retries. I changed the section to explain that SNS retries delivery failures to AWS managed endpoints up to 100,015 attempts over 23 days, while Lambda handles accepted asynchronous invocation failures with up to two retries by default.
- The post implied a subscription DLQ catches Lambda function processing failures. I clarified that SNS subscription DLQs handle delivery failures, while Lambda on-failure destinations or Lambda function DLQs are needed for function-code failures after Lambda accepts the event.
- The subscription DLQ CLI example created an SQS queue and set the SNS redrive policy, but omitted the SQS queue policy granting `sns.amazonaws.com` permission to send messages. I added an `aws sqs set-queue-attributes` example with an SQS policy scoped to the source SNS topic.
- The CDK comment said the DLQ receives failed invocations. I changed it to failed deliveries from SNS, matching the behavior of `LambdaSubscription`'s `deadLetterQueue`.
- The text said missing Lambda invoke permission causes messages to fail silently. I changed it to say SNS cannot deliver messages and recommended delivery logging or a subscription DLQ to capture failures.

## Review Notes
The Python and Node.js handler examples are syntactically valid and match the documented SNS Lambda event shape. The AWS CLI commands and SNS filter policy examples match current AWS documentation. The CDK example uses current AWS CDK v2 imports and documented `LambdaSubscriptionProps` fields.
