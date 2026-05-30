# Validation Summary: How to Use Targeted Push Notifications with Azure Notification Hubs Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Notification Hubs
- Notification Hubs tags and tag expressions
- Notification Hubs templates
- Microsoft.Azure.NotificationHubs .NET SDK
- Firebase Cloud Messaging v1
- Apple Push Notification service
- C#

## Sources Consulted
- Azure Notification Hubs routing and tag expressions: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-tags-segment-push-message
- Azure Notification Hubs templates: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-templates-cross-platform-push-messages
- Google Firebase Cloud Messaging migration using Azure SDKs: https://learn.microsoft.com/en-us/azure/notification-hubs/firebase-migration-sdk
- NotificationHubClient.SendTemplateNotificationAsync API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.notificationhubs.notificationhubclient.sendtemplatenotificationasync
- AppleTemplateRegistrationDescription constructor API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.notificationhubs.appletemplateregistrationdescription.-ctor
- AppleTemplateRegistrationDescription.TemplateName API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.notificationhubs.appletemplateregistrationdescription.templatename
- Microsoft.Azure.NotificationHubs 4.2.0 NuGet package XML metadata for FCM v1 registration/template/send API surface: https://www.nuget.org/packages/Microsoft.Azure.NotificationHubs/4.2.0

## Issues Found
- The Android examples used legacy FCM registration and send APIs. Updated them to `FcmV1RegistrationDescription`, `FcmV1TemplateRegistrationDescription`, and `SendFcmV1NativeNotificationAsync`, and changed the Android template payload to the FCM v1 `message` shape.
- The tag expression limit was stated as 20 tags for every expression. Updated it to the documented limits: 20 tags for OR-only expressions, 10 tags for AND-only expressions, and 6 tags for mixed expressions.
- The tag rules said any naming convention could be used without mentioning allowed characters. Added the documented allowed non-alphanumeric characters for tags.
- The APNs badge template used `$(badge)` as an unquoted JSON number. Changed it to `#(badge)`, which is the documented JSON template expression form for numeric JSON output.
- The breaking-news template embedded text before a placeholder in a JSON string. Changed it to the documented template concatenation form.
- Several C# snippets mixed top-level statements with `public` methods. Removed the access modifiers so the examples are syntactically valid as top-level/local-function snippets.

## Review Notes
- The post remains a concise tutorial and is technically relevant. The examples assume `Microsoft.Azure.NotificationHubs` 4.2.0 or newer for FCM v1 support.
