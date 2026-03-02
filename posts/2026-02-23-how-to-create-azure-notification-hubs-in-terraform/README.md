# How to Create Azure Notification Hubs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Notification Hub, Push Notifications, Infrastructure as Code, Mobile

Description: Learn how to create Azure Notification Hubs with Terraform for sending push notifications to iOS, Android, Windows, and other platforms at scale.

---

Push notifications are how your mobile and web applications stay connected with users when the app is not in the foreground. Azure Notification Hubs provides a cross-platform push notification engine that handles the complexity of communicating with Apple Push Notification Service (APNs), Firebase Cloud Messaging (FCM), Windows Notification Service (WNS), and other platform notification services.

This guide covers creating and configuring Azure Notification Hubs with Terraform, setting up platform credentials, and structuring your notification infrastructure.

## How Notification Hubs Work

The architecture has three layers:

1. **Namespace**: A container for one or more notification hubs. Provides the management endpoint and shared access policies.
2. **Notification Hub**: The actual hub that connects to platform notification services (APNs, FCM, etc.) and handles device registrations and message sending.
3. **Platform Notification Services**: The external services (Apple, Google, Microsoft) that deliver notifications to devices.

Your backend application sends notifications to the hub, and the hub fans them out to the appropriate platform services based on device registrations.

## Creating a Notification Hub Namespace

Start with the namespace:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource group
resource "azurerm_resource_group" "notifications" {
  name     = "rg-notifications-prod"
  location = "East US"
}

# Notification Hub Namespace
resource "azurerm_notification_hub_namespace" "main" {
  name                = "nhn-prod-contoso"
  resource_group_name = azurerm_resource_group.notifications.name
  location            = azurerm_resource_group.notifications.location

  # Namespace type is always NotificationHub
  namespace_type = "NotificationHub"

  # SKU: Free, Basic, or Standard
  sku_name = "Standard"

  # Enable or disable the namespace
  enabled = true

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

The SKU determines your limits and features:

- **Free**: 500 devices, 1 million pushes per month, no SLA. Good for development.
- **Basic**: 200K devices, 10 million pushes per month, SLA included. No scheduled pushes or rich telemetry.
- **Standard**: 10 million devices, 10 million pushes per month (included, with overage pricing), full features including scheduled push, multi-tenancy, and telemetry.

## Creating a Notification Hub

Create a hub within the namespace:

```hcl
# Notification Hub
resource "azurerm_notification_hub" "main" {
  name                = "nh-myapp-prod"
  namespace_name      = azurerm_notification_hub_namespace.main.name
  resource_group_name = azurerm_resource_group.notifications.name
  location            = azurerm_resource_group.notifications.location

  # Apple Push Notification Service configuration
  apns_credential {
    # Token-based authentication (recommended)
    application_mode = "Production"
    key_id           = var.apns_key_id
    team_id          = var.apns_team_id
    token            = var.apns_token
    bundle_id        = var.apns_bundle_id
  }

  # Firebase Cloud Messaging (for Android)
  gcm_credential {
    api_key = var.fcm_api_key
  }

  tags = {
    application = "myapp"
    environment = "production"
  }
}
```

## Configuring Platform Credentials with Variables

Keep your platform credentials secure using variables:

```hcl
# variables.tf

# Apple Push Notification Service (APNs)
variable "apns_key_id" {
  description = "APNs authentication key ID"
  type        = string
  sensitive   = true
}

variable "apns_team_id" {
  description = "Apple Developer team ID"
  type        = string
  sensitive   = true
}

variable "apns_token" {
  description = "APNs authentication token (.p8 key content)"
  type        = string
  sensitive   = true
}

variable "apns_bundle_id" {
  description = "iOS app bundle identifier"
  type        = string
  default     = "com.contoso.myapp"
}

# Firebase Cloud Messaging (FCM)
variable "fcm_api_key" {
  description = "Firebase Cloud Messaging server key"
  type        = string
  sensitive   = true
}
```

## Authorization Rules

Notification Hubs use Shared Access Signature (SAS) policies for authentication. The namespace comes with default policies, but you can create custom ones:

```hcl
# Authorization rule for the backend to send notifications
resource "azurerm_notification_hub_authorization_rule" "backend" {
  name                  = "BackendSend"
  notification_hub_name = azurerm_notification_hub.main.name
  namespace_name        = azurerm_notification_hub_namespace.main.name
  resource_group_name   = azurerm_resource_group.notifications.name

  # Only allow sending - not managing or listening
  manage = false
  send   = true
  listen = false
}

# Authorization rule for the mobile app to register devices
resource "azurerm_notification_hub_authorization_rule" "mobile_app" {
  name                  = "MobileAppListen"
  notification_hub_name = azurerm_notification_hub.main.name
  namespace_name        = azurerm_notification_hub_namespace.main.name
  resource_group_name   = azurerm_resource_group.notifications.name

  # Only allow listening (registration) - not sending or managing
  manage = false
  send   = false
  listen = true
}

# Full management rule for admin operations
resource "azurerm_notification_hub_authorization_rule" "admin" {
  name                  = "AdminFullAccess"
  notification_hub_name = azurerm_notification_hub.main.name
  namespace_name        = azurerm_notification_hub_namespace.main.name
  resource_group_name   = azurerm_resource_group.notifications.name

  manage = true
  send   = true
  listen = true
}
```

The principle of least privilege applies here: your mobile app should only have Listen access (to register for push notifications), your backend should have Send access (to push notifications), and management access should be restricted to admin tools.

## Multiple Hubs for Multiple Apps

If you have multiple applications, create separate hubs within the same namespace:

```hcl
# Define apps that need push notifications
variable "apps" {
  description = "Map of app names to their notification configuration"
  type = map(object({
    apns_bundle_id = string
    apns_mode      = string
    fcm_key        = string
  }))
}

# Create a hub for each app
resource "azurerm_notification_hub" "apps" {
  for_each = var.apps

  name                = "nh-${each.key}-prod"
  namespace_name      = azurerm_notification_hub_namespace.main.name
  resource_group_name = azurerm_resource_group.notifications.name
  location            = azurerm_resource_group.notifications.location

  apns_credential {
    application_mode = each.value.apns_mode
    key_id           = var.apns_key_id
    team_id          = var.apns_team_id
    token            = var.apns_token
    bundle_id        = each.value.apns_bundle_id
  }

  gcm_credential {
    api_key = each.value.fcm_key
  }
}
```

## Separate Hubs for Dev and Production APNs

Apple has separate environments for development (sandbox) and production push notifications. Create separate hubs for each:

```hcl
# Development hub - uses APNs sandbox
resource "azurerm_notification_hub" "dev" {
  name                = "nh-myapp-dev"
  namespace_name      = azurerm_notification_hub_namespace.main.name
  resource_group_name = azurerm_resource_group.notifications.name
  location            = azurerm_resource_group.notifications.location

  apns_credential {
    application_mode = "Sandbox"
    key_id           = var.apns_key_id
    team_id          = var.apns_team_id
    token            = var.apns_token
    bundle_id        = var.apns_bundle_id
  }

  gcm_credential {
    api_key = var.fcm_api_key
  }
}

# Production hub - uses APNs production
resource "azurerm_notification_hub" "prod" {
  name                = "nh-myapp-prod"
  namespace_name      = azurerm_notification_hub_namespace.main.name
  resource_group_name = azurerm_resource_group.notifications.name
  location            = azurerm_resource_group.notifications.location

  apns_credential {
    application_mode = "Production"
    key_id           = var.apns_key_id
    team_id          = var.apns_team_id
    token            = var.apns_token
    bundle_id        = var.apns_bundle_id
  }

  gcm_credential {
    api_key = var.fcm_api_key
  }
}
```

## Storing Connection Strings in Key Vault

```hcl
# Store the send connection string for the backend
resource "azurerm_key_vault_secret" "nh_send_connection" {
  name         = "notification-hub-send-connection"
  value        = azurerm_notification_hub_authorization_rule.backend.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

# Store the listen connection string for the mobile app
resource "azurerm_key_vault_secret" "nh_listen_connection" {
  name         = "notification-hub-listen-connection"
  value        = azurerm_notification_hub_authorization_rule.mobile_app.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}
```

## Outputs

```hcl
output "namespace_name" {
  description = "Name of the Notification Hub namespace"
  value       = azurerm_notification_hub_namespace.main.name
}

output "hub_name" {
  description = "Name of the Notification Hub"
  value       = azurerm_notification_hub.main.name
}

output "namespace_id" {
  description = "Resource ID of the namespace"
  value       = azurerm_notification_hub_namespace.main.id
}
```

## Best Practices

**Use token-based APNs authentication.** Token-based auth with a .p8 key is simpler than certificate-based auth and does not expire annually.

**Create separate hubs for dev and production.** APNs sandbox and production are different environments. Mixing them causes delivery failures.

**Follow least-privilege for access policies.** Your mobile app only needs Listen, your backend only needs Send. Do not give everything full management access.

**Monitor registration counts.** If your device registration count drops suddenly, it may indicate an issue with your mobile app's registration code.

**Use tags for targeted notifications.** Instead of sending to all devices, use tags to target specific user segments. This reduces unnecessary push notifications and improves user experience.

**Store credentials in Key Vault.** Platform credentials (APNs tokens, FCM keys) and SAS keys should be in Key Vault, referenced through managed identity.

## Wrapping Up

Azure Notification Hubs with Terraform gives you a managed push notification infrastructure that scales to millions of devices. Terraform handles the namespace, hub, platform credentials, and access policies. Your application code handles device registration and notification sending. This separation keeps your infrastructure repeatable and your notification logic clean.
