# Validation Summary: How to Create Azure Notification Hubs in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Notification Hubs
- Azure Key Vault
- Apple Push Notification Service (APNs)
- Firebase Cloud Messaging (FCM) / Google Cloud Messaging (GCM)
- Shared Access Signature (SAS) authorization rules

## Sources Consulted
- HashiCorp AzureRM provider docs for `azurerm_notification_hub_namespace`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace
- HashiCorp AzureRM provider docs for `azurerm_notification_hub`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub
- HashiCorp AzureRM provider docs for `azurerm_notification_hub_authorization_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule
- Microsoft Learn Terraform quickstart for Azure Notification Hubs: https://learn.microsoft.com/en-us/azure/notification-hubs/create-notification-hub-terraform
- Microsoft Learn Notification Hubs security model: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-push-notification-security
- Microsoft Learn APNs token-based authentication for Notification Hubs: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-push-notification-http2-token-authentication
- Microsoft Learn Azure Notification Hubs FCM migration guidance: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-gcm-to-fcm
- Microsoft Azure Notification Hubs pricing page: https://azure.microsoft.com/en-us/pricing/details/notification-hubs/

## Issues Found
- The APNs token variable described the value as `.p8 key content` without saying that Notification Hubs expects the key content without the PEM header/footer. Updated the variable description to clarify this requirement.
- The Key Vault section said it was storing connection strings, but the Terraform examples used `primary_access_key`, which stores only the SAS key. Renamed the section, comments, and secret resource names to say access keys.
- The Android credential examples described `gcm_credential` as Firebase Cloud Messaging without noting that this is the legacy GCM/FCM API key model. Added a short caveat that new Android deployments should use FCM v1 credentials and may need Azure portal, CLI, REST API, or SDK configuration if the Terraform provider does not expose FCM v1 fields.

## Review Notes
- The core Terraform resource names and arguments for the namespace, hub, and hub authorization rules are valid for the AzureRM provider family used by the post.
- The pricing limits in the post match the current Azure pricing table at the time of review: Free has 500 active devices, Basic has 200,000 active devices, and Standard has 10,000,000 active devices.
