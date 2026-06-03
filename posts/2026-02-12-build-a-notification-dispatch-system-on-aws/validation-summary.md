# Validation Summary: How to Build a Notification Dispatch System on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS EventBridge
- AWS Lambda
- Amazon SQS
- Amazon DynamoDB
- Amazon SES
- Amazon SNS, including SMS and mobile push
- Python
- boto3
- Slack webhooks

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3.12/library/datetime.html
- boto3 EventBridge put_events documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/events/client/put_events.html
- boto3 DynamoDB update_item documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/update_item.html
- boto3 SES send_email documentation: https://boto3.amazonaws.com/v1/documentation/api/1.26.85/reference/services/ses/client/send_email.html
- boto3 SNS publish documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sns/client/publish.html
- AWS Lambda with SQS documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- Amazon SNS mobile push endpoint documentation: https://docs.aws.amazon.com/sns/latest/dg/mobile-platform-endpoint.html
- Amazon SNS mobile push API documentation: https://docs.aws.amazon.com/sns/latest/dg/mobile-push-api.html

## Issues Found
- The post used `datetime.utcnow()`, which is deprecated in Python 3.12 because it returns a naive datetime. I changed the examples to use `datetime.now(timezone.utc).isoformat()`.
- The email sender assumed `users_table.get_item(... )['Item']` always exists. I changed it to read `.get('Item', {})` so a missing user record is handled as a missing email address instead of raising `KeyError`.
- The SMS sender truncated messages to 160 characters and described that as the SMS character limit. Amazon SNS supports up to 1,600 characters in a single SMS `Publish` action, so I changed the truncation limit and comment.
- The architecture and article say delivery is logged for each channel, but the SMS sender did not write to `NotificationDeliveryLog`. I added success and failure logging around `sns.publish()`.
- The SMS sender also assumed the user record always exists. I changed it to handle missing records and log a failed delivery when no phone number is available.

## Review Notes
- The EventBridge `put_events`, SES `send_email`, DynamoDB `update_item`, SQS `send_message`, and SNS `publish` API usage matches current boto3 documentation at the level shown in the post.
- SES requires verified sending identities, and sandbox accounts can only send to verified recipients or simulator addresses. The post uses a placeholder sender address, which is acceptable for an example but must be configured in a real deployment.
- SNS SMS publishing expects phone numbers in E.164 format. The example looks up the phone number from a user table but does not show validation.
- Lambda SQS event source mappings are at-least-once and require idempotent handlers or partial batch response handling for production reliability.
- The router snippet calls `get_template()` and `render_template()` from the earlier template example; those helpers would need to be packaged with the router Lambda in an actual implementation.
