# Validation Summary: How to Build Azure Notification Hub Namespace with Platform Notification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Notification Hubs
- Terraform
- AzureRM Terraform provider
- Azure CLI
- Azure Key Vault
- Azure Monitor diagnostic settings
- Apple Push Notification service (APNs)
- Firebase Cloud Messaging (FCM)
- Windows Notification Service (WNS)

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_notification_hub`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub
- HashiCorp AzureRM provider documentation for `azurerm_notification_hub_authorization_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_authorization_rule
- HashiCorp AzureRM provider documentation for `azurerm_notification_hub_namespace`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/notification_hub_namespace
- Microsoft Learn Azure Notification Hubs ARM template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.notificationhubs/2023-09-01/namespaces/notificationhubs
- Microsoft Learn Azure CLI `az notification-hub` reference: https://learn.microsoft.com/en-us/cli/azure/notification-hub
- Microsoft Learn Notification Hubs platform notification settings guide: https://learn.microsoft.com/en-us/azure/notification-hubs/configure-notification-hub-portal-pns-settings
- Microsoft Learn FCM migration guidance for Azure Notification Hubs: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-gcm-to-fcm
- Firebase FCM legacy API migration guide: https://firebase.google.com/docs/cloud-messaging/migrate-v1
- Microsoft Learn Notification Hubs monitoring and diagnostic logs documentation: https://learn.microsoft.com/en-us/azure/notification-hubs/monitor-notification-hubs
- Microsoft Azure Notification Hubs pricing page: https://azure.microsoft.com/en-us/pricing/details/notification-hubs/

## Issues Found
- The post claimed the Terraform example fully configured Apple, Google, and Windows platform notification settings. The current AzureRM `azurerm_notification_hub` resource supports APNs credentials and legacy `gcm_credential`, but does not expose WNS or FCM v1 credential blocks. I narrowed the description and added a caveat that FCM v1 and WNS require another configuration path such as portal, REST, ARM/Bicep, or AzAPI.
- The Terraform example used `gcm_credential` with an FCM server key. Microsoft and Firebase both document that FCM legacy APIs are retired, so I removed the legacy server-key variables, `gcm_credential` blocks, tfvars value, and Android test-send example.
- The Key Vault examples and `listen_connection_string` output were labeled as connection strings but used `primary_access_key`. I changed them to `primary_connection_string`, which is the Terraform attribute exported for Notification Hub SAS connection strings.
- The APNs token example included the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` wrapper lines. The AzureRM provider expects the key content between those lines, so I clarified the variable description and updated the tfvars example.

## Review Notes
- The Azure CLI Notification Hubs command group is provided by an extension and Microsoft marks several commands as experimental. The APNs test-send example is plausible, but teams should verify it against the installed extension version or use the portal Test Send workflow if the CLI extension changes.
- The post now focuses the Terraform-managed platform credential example on APNs because that is the non-retired platform credential path directly supported by the AzureRM resource.
