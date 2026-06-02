# Validation Summary: How to Handle SES Bounces and Complaints with SNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SES
- Amazon SNS
- AWS Lambda
- AWS CLI
- DynamoDB
- Python
- CloudWatch

## Sources Consulted
- Amazon SES Developer Guide: Amazon SNS notification contents for Amazon SES: https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html
- AWS CLI Command Reference: `aws ses set-identity-notification-topic`: https://docs.aws.amazon.com/cli/latest/reference/ses/set-identity-notification-topic.html
- AWS Lambda Developer Guide: Using AWS Lambda with Amazon SNS: https://docs.aws.amazon.com/lambda/latest/dg/with-sns-example.html
- AWS CLI Command Reference: `aws lambda add-permission`: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- Amazon SES Developer Guide: Sending review process FAQs: https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html
- Amazon SES Developer Guide: Email program success metrics: https://docs.aws.amazon.com/ses/latest/dg/success-metrics.html
- Amazon SES Developer Guide: Receiving Amazon SES notifications through email: https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications-email.html
- Amazon SES Developer Guide: Using the Amazon SES account-level suppression list: https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html
- AWS CLI Command Reference: `aws sesv2 list-suppressed-destinations`: https://docs.aws.amazon.com/cli/latest/reference/sesv2/list-suppressed-destinations.html
- Amazon SES Developer Guide: Sending test emails with the mailbox simulator: https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html

## Issues Found
- The example ARNs used `123456789` as an AWS account ID placeholder. AWS account IDs are 12 digits in ARN examples and Lambda ARN validation patterns, so the examples were changed to `123456789012`.
- The Lambda code called `time.time()` but did not import `time` in the code block. Added `import time` and removed the follow-up note that told readers to add it separately.
- The Lambda subscription example subscribed only bounce and complaint topics even though the post configured and handled delivery notifications too. Added the optional delivery-topic subscription so the example is complete when delivery notifications are enabled.
- The Lambda permission example granted SNS invoke access only for the bounce topic. Because the permission was scoped with `--source-arn`, complaint and delivery topics would not be authorized to invoke the function. Added separate `add-permission` commands for complaint and delivery topics.
- The account-level suppression list section said SES stops sending before the API call is made. AWS documentation states SES accepts messages to matching suppressed addresses but does not attempt delivery, so the wording was corrected.

## Review Notes
The SES v1 identity notification commands are still present in the AWS CLI and valid for configuring bounce, complaint, and delivery SNS topics on verified identities. SES account-level suppression lists are region-specific and API management is case-sensitive; the post's separate application-level suppression list remains a reasonable recommendation.
