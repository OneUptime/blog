# Validation Summary: How to Use Amazon Pinpoint for Targeted User Engagement

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Pinpoint
- AWS CLI
- Amazon SES email identities
- SMS messaging
- APNs push notifications
- Firebase Cloud Messaging
- Pinpoint endpoints, segments, campaigns, journeys, and analytics events

## Sources Consulted
- AWS Amazon Pinpoint end-of-support notice: https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html
- AWS CLI `pinpoint create-app` command reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/pinpoint/create-app.html
- AWS CLI `pinpoint update-email-channel` command reference: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/update-email-channel.html
- AWS CLI `pinpoint update-sms-channel` command reference: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/update-sms-channel.html
- AWS CLI `pinpoint update-apns-channel` command reference: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/update-apns-channel.html
- AWS CLI `pinpoint update-gcm-channel` command reference: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/update-gcm-channel.html
- AWS Pinpoint endpoint import documentation: https://docs.aws.amazon.com/pinpoint/latest/developerguide/audience-define-import.html
- AWS CLI `pinpoint create-campaign` command reference: https://awscli.amazonaws.com/v2/documentation/api/2.0.34/reference/pinpoint/create-campaign.html
- AWS CLI `pinpoint create-journey` command reference: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/create-journey.html
- AWS CLI `pinpoint send-messages` command reference: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/send-messages.html
- AWS CLI `pinpoint put-events` command reference: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/put-events.html
- Amazon Pinpoint email event stream documentation: https://docs.aws.amazon.com/pinpoint/latest/developerguide/event-streams-data-email.html

## Issues Found
- Added a current Pinpoint lifecycle caveat. AWS no longer accepts new Amazon Pinpoint customers as of May 20, 2025, and Pinpoint engagement features end support on October 30, 2026.
- Updated the FCM channel example from legacy API key authentication to `DefaultAuthenticationMethod: "TOKEN"` with `ServiceJson`, matching current Pinpoint support for FCM HTTP v1 credentials.
- Corrected the segment example comment. The sample filters premium users only; it did not implement a "signed up in the last 30 days" condition.
- Changed the campaign `Timezone` value from `America/Los_Angeles` to `UTC`, because the Pinpoint campaign schedule schema accepts UTC offsets rather than IANA time zone names.
- Fixed the journey request shape by adding `StartActivity`, moving `NextActivity` inside the relevant activity objects, changing the journey name to remove spaces, and adding the referenced follow-up activities.
- Replaced journey wait values `3d` and `1d` with ISO 8601 duration values `P3D` and `P1D`.
- Changed the email open event type from `email.open` to the documented Pinpoint event type `_email.open`.
- Added an explicit `FromAddress` to the transactional email example so the direct email send is self-contained and does not rely on a channel default.

## Review Notes
Amazon Pinpoint examples remain relevant for existing Pinpoint customers before the October 30, 2026 support end date. For new implementations or new AWS customers, AWS recommends migrating engagement use cases to Amazon Connect customer engagement services and using AWS End User Messaging for supported messaging APIs.
