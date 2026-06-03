# Validation Summary: How to Build a Notification System on AWS (Email, SMS, Push)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon API Gateway
- Amazon SQS
- Amazon DynamoDB
- Amazon SES
- Amazon SNS SMS
- Amazon SNS mobile push notifications
- AWS SDK for JavaScript v3
- AWS CDK

## Sources Consulted
- AWS SDK for JavaScript v3 SESv2 SendEmailCommand documentation: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/sesv2-2019-09-27/SendEmail
- Amazon SNS SMS publishing documentation: https://docs.aws.amazon.com/sns/latest/dg/sms_sending-overview.html
- Amazon SNS platform-specific mobile push payload documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-send-custom-platform-specific-payloads-mobile-devices.html
- Amazon SNS FCM HTTP v1 payload documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-fcm-v1-payloads.html
- Amazon SNS platform endpoint documentation: https://docs.aws.amazon.com/sns/latest/dg/mobile-platform-endpoint.html
- Amazon SES SNS event destination documentation: https://docs.aws.amazon.com/ses/latest/dg/event-publishing-add-event-destination-sns.html
- AWS CDK SES ConfigurationSet and event destination documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ses-readme.html
- AWS CDK SES EmailSendingEvent enum documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ses.EmailSendingEvent.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- Amazon SES sending quota documentation: https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html
- AWS Lambda with Amazon SQS documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html

## Issues Found
- The push notification example stored and passed `deviceToken` to SNS `Publish` as `TargetArn`. Amazon SNS direct mobile push sends to a platform endpoint ARN created from the device token, so the example now uses `deviceEndpointArn` consistently.
- The Android push payload used the older FCM legacy payload shape. Amazon SNS now supports FCM HTTP v1 payloads through the `GCM` envelope with an `fcmV1Message` body, so the example was updated to that structure.
- The SES tracking CDK snippet created an SNS topic and Lambda subscription but did not configure the SES configuration set event destination that actually publishes SES events to the topic. The snippet now creates the `notification-tracking` configuration set and adds an SNS event destination for delivery, bounce, complaint, open, and click events.
- The CDK Lambda example used `lambda.Runtime.NODEJS_18_X`, which is deprecated as of the review date. It was updated to `lambda.Runtime.NODEJS_22_X`, which is supported by AWS Lambda and AWS CDK.

## Review Notes
The examples are suitable as tutorial snippets, but a production implementation should also add stronger request validation, idempotency, per-channel retry behavior, SQS partial batch failure handling, opt-out/compliance handling for SMS, and a real template rendering strategy.
