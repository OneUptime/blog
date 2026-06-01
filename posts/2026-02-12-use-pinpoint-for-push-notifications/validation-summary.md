# Validation Summary: How to Use Pinpoint for Push Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Pinpoint
- AWS End User Messaging Push
- AWS CLI
- Boto3 for Python
- Apple Push Notification service (APNs)
- Firebase Cloud Messaging (FCM)

## Sources Consulted
- Amazon Pinpoint end of support: https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html
- Amazon Pinpoint APNs channel API reference: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-channels-apns.html
- AWS CLI `update-gcm-channel` command reference: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/update-gcm-channel.html
- Amazon Pinpoint endpoint API reference: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-endpoints-endpoint-id.html
- Amazon Pinpoint users messages API reference: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-users-messages.html
- AWS End User Messaging Push send message reference: https://docs.aws.amazon.com/push-notifications/latest/userguide/reference-send-message.html
- Amazon Pinpoint campaign metrics documentation: https://docs.aws.amazon.com/pinpoint/latest/developerguide/application-metrics-campaigns.html
- AWS CLI `create-campaign` command reference: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/create-campaign.html

## Issues Found
- The post described setting up Pinpoint from scratch without noting the current service lifecycle. Added the May 20, 2025 new-customer cutoff, the October 30, 2026 end-of-support date for Pinpoint engagement features, and the AWS End User Messaging continuity note for mobile push APIs.
- The FCM setup used legacy server-key credentials through `ApiKey`. Updated the text and examples to use FCM HTTP v1 service account credentials through `ServiceJson` with `DefaultAuthenticationMethod` set to `TOKEN`.
- The APNs certificate example read a `.p12` file and base64-encoded it, but the API fields are certificate and private key strings. Updated the example to read PEM certificate and key files.
- The APNs token-key example did not specify the authentication method. Added `DefaultAuthenticationMethod` set to `TOKEN`.
- The direct-send section said to use `send_messages` while the code correctly called `send_users_messages`. Corrected the text.
- Visible push examples put custom data into the per-channel `Data` field, which Pinpoint documents for silent push payloads. Updated visible push examples to use request-level `Context`, which Pinpoint adds under `data.pinpoint`.
- The rich notification section implied that Pinpoint alone configures buttons and custom layouts. Clarified that those require app-side notification category or action handling, and adjusted the example to send action context instead of using a URL action without a `Url`.

## Review Notes
Amazon Pinpoint engagement features, including endpoints, segments, campaigns, journeys, analytics, and email, are scheduled to end support on October 30, 2026. Existing customers can still use the tutorial before that date, and AWS states that mobile push APIs continue under AWS End User Messaging. The APNs `DefaultAuthenticationMethod` naming is inconsistent across AWS documentation surfaces, but token-based APNs authentication is represented as `TOKEN` in the API-style examples reviewed.
