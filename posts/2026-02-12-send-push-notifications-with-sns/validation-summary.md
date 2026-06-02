# Validation Summary: How to Send Push Notifications with SNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SNS mobile push notifications
- AWS CLI
- boto3 for Python
- Firebase Cloud Messaging
- Apple Push Notification Service
- Amazon CloudWatch metrics

## Sources Consulted
- AWS CLI Command Reference: create-platform-application - https://docs.aws.amazon.com/cli/latest/reference/sns/create-platform-application.html
- Amazon SNS Developer Guide: FCM authentication methods - https://docs.aws.amazon.com/sns/latest/dg/sns-fcm-authentication-methods.html
- Amazon SNS Developer Guide: Publishing platform-specific mobile payloads - https://docs.aws.amazon.com/sns/latest/dg/sns-send-custom-platform-specific-payloads-mobile-devices.html
- Amazon SNS Developer Guide: Setting up platform endpoints - https://docs.aws.amazon.com/sns/latest/dg/mobile-platform-endpoint.html
- Amazon SNS API Reference: Publish - https://docs.aws.amazon.com/sns/latest/api/API_Publish.html
- Amazon SNS API Reference: Subscribe - https://docs.aws.amazon.com/sns/latest/api/API_Subscribe.html
- boto3 SNS create_platform_application reference - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sns/service-resource/create_platform_application.html
- boto3 SNS delete_endpoint reference - https://docs.aws.amazon.com/boto3/latest/reference/services/sns/client/delete_endpoint.html
- Amazon SNS CloudWatch monitoring documentation - https://docs.aws.amazon.com/sns/latest/dg/sns-monitoring-using-cloudwatch.html
- Firebase Cloud Messaging HTTP v1 send documentation - https://firebase.google.com/docs/cloud-messaging/auth-server
- Firebase Cloud Messaging message types documentation - https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type
- Apple Developer Documentation: Generating a remote notification - https://developer.apple.com/documentation/UserNotifications/generating-a-remote-notification

## Issues Found
- The FCM setup section presented an FCM server key as the main credential path even though FCM v1 service-account authentication is the current recommended approach. I marked the server-key example as legacy and kept the FCM v1 service-account example as the recommended path.
- The SNS publish examples used the older direct FCM payload shape under the `GCM` key. SNS requires FCM HTTP v1 payloads to be wrapped in `fcmV1Message.message`, so I updated the direct-send and broadcast examples accordingly.
- The direct FCM data payload accepted arbitrary values. FCM HTTP v1 data payload values should be strings, so I converted custom data keys and values to strings in the example.
- The token-update helper described handling changed device tokens but only handled duplicate-token errors. I updated it to accept a stored endpoint ARN, check endpoint attributes, update the token, re-enable disabled endpoints, and only fall back to `create_platform_endpoint` when there is no usable stored endpoint.
- The cleanup section did not mention that SNS topic subscriptions should be unsubscribed when deleting subscribed platform endpoints. I added that caveat.

## Review Notes
The post is technically relevant and valid after the corrections. The AWS CLI was not available in the workspace under a usable `aws` command, so CLI syntax was verified against the official AWS CLI command reference instead of local `--help` output.
