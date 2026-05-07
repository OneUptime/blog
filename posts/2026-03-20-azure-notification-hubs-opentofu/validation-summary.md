# Validation Summary: How to Create Azure Notification Hubs with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Notification Hubs
- OpenTofu CLI
- AzureRM provider
- HCL
- Apple Push Notification service (APNs)

## Sources Consulted
- AzureRM provider `azurerm_notification_hub`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v4.67.0/website/docs/r/notification_hub.html.markdown
- AzureRM provider `azurerm_notification_hub_namespace`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v4.67.0/website/docs/r/notification_hub_namespace.html.markdown
- AzureRM provider `azurerm_notification_hub_authorization_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v4.67.0/website/docs/r/notification_hub_authorization_rule.html.markdown
- Microsoft Learn, Azure Notification Hubs overview: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-push-notification-overview
- Microsoft Learn, Azure Notification Hubs and Google Firebase Cloud Messaging migration: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-gcm-to-fcm
- Microsoft Learn, Google Firebase Cloud Messaging migration using REST API and the Azure portal: https://learn.microsoft.com/en-us/azure/notification-hubs/firebase-migration-rest
- OpenTofu CLI `plan` command: https://opentofu.org/docs/cli/commands/plan/

## Issues Found
- The post used the legacy `gcm_credential` block and `fcm_server_key` variable for Android. Microsoft now requires FCM v1, and the current AzureRM `azurerm_notification_hub` resource documents only the legacy `gcm_credential` field. I removed the Android credential example and added a note clarifying that the legacy block should not be used for new Android configurations.
- The APNs `token` comment implied the full `.p8` file contents were expected. The AzureRM provider docs specify the key contents between the `BEGIN PRIVATE KEY` and `END PRIVATE KEY` lines. I corrected the comment.
- The `hub_connection_string` output returned `primary_access_key`, which is not a connection string. I changed it to `primary_connection_string`.

## Review Notes
- Azure Notification Hubs itself still supports Android, iOS, and Windows delivery, but Android credentials now require FCM v1.
- As of AzureRM provider v4.67.0, the documented `azurerm_notification_hub` resource exposes APNs, browser, and legacy GCM credential blocks, not FCM v1 fields.
