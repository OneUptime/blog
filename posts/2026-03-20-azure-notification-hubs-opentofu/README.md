# How to Create Azure Notification Hubs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Notification Hub, Push Notification, Infrastructure as Code, Mobile

Description: Learn how to create Azure Notification Hub namespaces and hubs with OpenTofu to send push notifications to iOS, Android, and Windows devices at scale.

## Introduction

Azure Notification Hubs is a scalable push notification engine that lets you send notifications to any platform (APNs, FCM, WNS) from any backend. OpenTofu automates the provisioning of namespaces, hubs, authorization rules, and APNs credential configuration.

## Creating a Notification Hub Namespace

```hcl
resource "azurerm_notification_hub_namespace" "main" {
  name                = "myapp-notifications-ns"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  namespace_type      = "NotificationHub"

  # Choose SKU: Free, Basic, or Standard
  sku_name = "Standard"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Creating a Notification Hub

The current `azurerm_notification_hub` resource supports APNs credentials directly. For Android, Azure Notification Hubs now uses FCM v1 credentials, so the legacy `gcm_credential` block should not be used for new configurations.

```hcl
resource "azurerm_notification_hub" "main" {
  name                = "myapp-hub"
  namespace_name      = azurerm_notification_hub_namespace.main.name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  # Apple Push Notification Service (APNs) credentials
  apns_credential {
    application_mode = "Production"  # or "Sandbox" for development
    bundle_id        = var.apns_bundle_id
    key_id           = var.apns_key_id
    team_id          = var.apns_team_id
    token            = var.apns_token  # APNs auth key contents, without the BEGIN/END PRIVATE KEY lines
  }
}
```

## Authorization Rules

Create authorization rules for different access levels (listen-only for devices, full access for backends).

```hcl
resource "azurerm_notification_hub_authorization_rule" "listen" {
  name                  = "device-listen"
  notification_hub_name = azurerm_notification_hub.main.name
  namespace_name        = azurerm_notification_hub_namespace.main.name
  resource_group_name   = azurerm_resource_group.main.name

  listen = true
  send   = false
  manage = false
}

resource "azurerm_notification_hub_authorization_rule" "backend" {
  name                  = "backend-full"
  notification_hub_name = azurerm_notification_hub.main.name
  namespace_name        = azurerm_notification_hub_namespace.main.name
  resource_group_name   = azurerm_resource_group.main.name

  listen = true
  send   = true
  manage = true
}
```

Resource Group

```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-notifications-${var.environment}"
  location = var.location
}
```

## Variables

```hcl
variable "environment"     { type = string }
variable "location"        { type = string  default = "East US" }
variable "apns_bundle_id"  { type = string  sensitive = true }
variable "apns_key_id"     { type = string  sensitive = true }
variable "apns_team_id"    { type = string  sensitive = true }
variable "apns_token"      { type = string  sensitive = true }
```

## Outputs

```hcl
output "hub_connection_string" {
  description = "Connection string for backend services"
  value       = azurerm_notification_hub_authorization_rule.backend.primary_connection_string
  sensitive   = true
}

output "hub_id" {
  value = azurerm_notification_hub.main.id
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

OpenTofu makes it easy to provision Azure Notification Hub namespaces, hubs, authorization rules, and APNs credentials as code. By separating listen and send authorization rules, you control which components of your system can register devices versus send push notifications.
