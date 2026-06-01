# Validation Summary: How to Use Amplify In-App Messaging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Amplify JavaScript
- Amplify In-App Messaging
- Amplify UI React Notifications
- Amazon Pinpoint campaigns and segments
- AWS CLI
- React and TypeScript

## Sources Consulted
- AWS Amplify Gen 2 React In-App Messaging documentation: https://docs.amplify.aws/react/frontend/in-app-messaging/
- AWS Amplify In-App Messaging setup documentation: https://docs.amplify.aws/react/build-a-backend/add-aws-services/in-app-messaging/set-up-in-app-messaging/
- AWS Amplify display messages documentation: https://docs.amplify.aws/react/frontend/in-app-messaging/display-messages/
- Amplify UI React In-App Messaging documentation: https://ui.docs.amplify.aws/react/connected-components/in-app-messaging
- Amplify JS API documentation for in-app messaging: https://aws-amplify.github.io/amplify-js/api/modules/aws_amplify.in_app_messaging.html
- Amazon Pinpoint In-App Messages API reference: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-endpoints-endpoint-id-inappmessages.html
- Amazon Pinpoint Campaigns API reference: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-campaigns.html
- AWS CLI `pinpoint create-campaign` command reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/pinpoint/create-campaign.html
- Amazon Pinpoint campaign scheduling documentation: https://docs.aws.amazon.com/pinpoint/latest/userguide/campaigns-schedule.html

## Issues Found
- The post used outdated package imports from `@aws-amplify/notifications`. Updated in-app messaging API imports to `aws-amplify/in-app-messaging` and React UI imports to `@aws-amplify/ui-react-notifications`, matching Amplify v6 documentation.
- The dependency installation command omitted the Amplify UI React notification packages used by the renderer example. Updated the install command.
- The Amplify CLI setup told users to add analytics separately. Current Amplify in-app messaging setup uses `amplify add notifications` and the In-App Messaging channel, so the command sequence was corrected.
- The manual configuration used the old `Notifications.InAppMessaging.AWSPinpoint` shape. Updated it to the current `notifications.amazon_pinpoint_app_id`, `aws_region`, and `channels` output shape.
- The Pinpoint campaign CLI example used an event filter with `Frequency: ONCE`, which is not the correct event-triggered in-app schedule. Updated it to `Frequency: IN_APP_EVENT`, added a `SegmentId`, and used `Limits.Total` for once-per-endpoint display behavior.
- The custom renderer example used incorrect props and imports. Updated it to use `InAppMessagingProvider`, `InAppMessageDisplay`, and the props shape shown in Amplify UI documentation.
- The interaction listener example treated `onMessageReceived` as a display callback and passed a second `action` argument to `onMessageActionTaken`. Updated it to use `onMessageDisplayed` and the documented single-message callback signature.
- The layout list included `FULL_SCREEN` and `MODAL`, which are not Pinpoint in-app campaign API layout enum values. Replaced them with `OVERLAYS` and `MOBILE_FEED`.
- Added the current Amazon Pinpoint end-of-support and new-customer availability caveat because it materially affects new implementations in 2026.

## Review Notes
The tutorial is valid for existing Amazon Pinpoint customers/projects, but Amazon Pinpoint support ends on October 30, 2026. Future updates should consider replacing this tutorial with migration-oriented guidance for AWS End User Messaging, Amazon SES, Amazon Connect, and Kinesis-based analytics where appropriate.
