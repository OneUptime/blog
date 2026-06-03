# Validation Summary: How to Configure SNS Message Delivery Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SNS
- Amazon SQS dead-letter queues
- AWS CLI
- Boto3 for Python
- AWS CDK for TypeScript
- Amazon CloudWatch Logs delivery status logging

## Sources Consulted
- Amazon SNS message delivery retries: https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html
- Optional HTTP/S delivery policy setup: https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.retry.html
- SetTopicAttributes delivery policy JSON format: https://docs.aws.amazon.com/sns/latest/dg/set-topic-attributes-delivery-policy-json.html
- Amazon SNS dead-letter queues: https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html
- Configuring an Amazon SNS dead-letter queue for a subscription: https://docs.aws.amazon.com/sns/latest/dg/sns-configure-dead-letter-queue.html
- SetSubscriptionAttributes API reference: https://docs.aws.amazon.com/sns/latest/api/API_SetSubscriptionAttributes.html
- SetTopicAttributes API reference: https://docs.aws.amazon.com/sns/latest/api/API_SetTopicAttributes.html
- Amazon SNS message delivery status: https://docs.aws.amazon.com/sns/latest/dg/sns-topic-attributes.html
- Configuring delivery status logging using AWS SDKs: https://docs.aws.amazon.com/sns/latest/dg/msg-status-sdk.html
- AWS CDK UrlSubscriptionProps API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions.UrlSubscriptionProps.html
- AWS CDK SNS module documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns-readme.html

## Issues Found
- The default delivery policy diagram incorrectly described HTTP/HTTPS as having 23 retries over about one hour. Updated it to the documented default of up to 3 retries with 20 seconds between failed attempts, and noted the 3,600-second total retry-time limit for custom HTTP/S policies.
- The diagram incorrectly described SQS as using infinite retries and Lambda as using 3 retries. Updated both to the current AWS-managed endpoint policy of 100,015 attempts over 23 days.
- The diagram incorrectly said Email and SMS have no retries. Updated Email/SMTP and SMS to the documented customer-managed endpoint policy of 50 attempts over 6 hours.
- The prose implied HTTP/HTTPS merely has the most configurable policy. Updated it to state that HTTP/HTTPS is the only protocol with customizable delivery policies.
- The HTTP/S policy examples used very long maximum retry delays, including a patient policy with a 3,600-second max delay and many post-backoff retries. Updated those values so the examples stay within Amazon SNS's documented 3,600-second total retry-time limit for HTTP/S endpoints.

## Review Notes
- The AWS CLI examples use valid `set-subscription-attributes`, `set-topic-attributes`, `set-queue-attributes`, and SNS attribute names.
- The Boto3 examples use current SNS and SQS client methods and valid attribute names.
- The CDK `UrlSubscription` example uses supported `protocol` and `deadLetterQueue` properties.
- The DLQ reprocessing example republishes to the topic, which can redeliver to all current subscribers rather than only the original failed subscription. That is acceptable for a simple tutorial, but production reprocessing should preserve message attributes and consider duplicate delivery.
