# Validation Summary: How to Target Specific Users with Tags in Azure Notification Hubs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Notification Hubs
- Azure Notification Hubs tags and tag expressions
- Azure Notification Hubs installations and registrations
- JavaScript / Node.js
- `@azure/notification-hubs`
- APNs and Firebase Cloud Messaging

## Sources Consulted
- Microsoft Learn: Routing and tag expressions in Azure Notification Hubs: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-tags-segment-push-message
- Microsoft Learn: Registration Management: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-push-notification-registration-management
- Microsoft Learn: NotificationHubsClient class for `@azure/notification-hubs`: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/notificationhubsclient
- Microsoft Learn: SendNotificationOptions interface for `@azure/notification-hubs`: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/sendnotificationoptions
- Microsoft Learn: FcmV1Notification interface for `@azure/notification-hubs`: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/fcmv1notification
- Microsoft Learn: FcmV1RegistrationDescription interface for `@azure/notification-hubs`: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/fcmv1registrationdescription
- Microsoft Learn: Update an installation REST API: https://learn.microsoft.com/en-us/rest/api/notificationhubs/update-installation
- `@azure/notification-hubs` 2.1.0 package type definitions from npm

## Issues Found
- The post described tags as arbitrary strings. Microsoft documents a 120-character limit and a limited set of allowed non-alphanumeric characters, so the wording was corrected.
- New registration examples used `createOrUpdateRegistration()` without a registration ID. In the current JavaScript SDK, that method updates by registration ID; the examples now use `createRegistration()` for new registrations.
- Send examples used `kind: 'Gcm'` for notifications. Current `@azure/notification-hubs` notification objects use `platform`, `contentType`, and `body`, so the examples were updated to `platform: 'fcmv1'` with JSON content type.
- Android registration examples used `kind: 'Gcm'` and `deviceToken`. Current FCM v1 registrations use `kind: 'FcmV1'` and `fcmV1RegistrationId`, so the multi-device example was corrected.
- The tag-expression limit was stated as a flat 20 tags. Microsoft documents 20 tags for OR-only expressions, 10 tags for AND-only expressions, and 6 tags for more complex expressions, so the limit text was corrected.
- The monitoring example named its parameter `tagExpression` and implied `listRegistrationsByTag()` could count an expression. The SDK method lists registrations for a single tag, so the example now uses `tag` and updates the variable names.

## Review Notes
The examples are still illustrative and omit production concerns such as token refresh, error handling, pagination limits, and provider-specific payload details. The post now aligns with current Azure Notification Hubs tag behavior and the current JavaScript SDK object shapes.
