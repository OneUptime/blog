# How to Build Azure Notification Hub Namespace with Platform Notification Settings in Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Notification Hub, Terraform, Push Notifications, Infrastructure as Code, Mobile, Cloud

Description: Deploy Azure Notification Hub namespaces with Apple, Google, and Windows platform notification settings fully configured using Terraform.

---

Push notifications are a core feature of mobile applications, and Azure Notification Hubs provides a scalable way to send them across platforms. The service abstracts away the differences between Apple Push Notification Service (APNs), Firebase Cloud Messaging (FCM), and Windows Notification Service (WNS), giving you a single API to reach devices on all platforms.

Setting up Notification Hubs involves creating a namespace, one or more hubs within it, and configuring the platform-specific credentials for each push notification service. Managing this through Terraform means you can replicate the setup across environments and keep the platform credentials in sync with your infrastructure code.

## Architecture Overview

A Notification Hub namespace is a container that holds one or more notification hubs. Each hub can have platform notification settings for APNs (iOS), FCM (Android), and WNS (Windows). You typically create one hub per application or per environment.

```mermaid
graph TD
    A[Notification Hub Namespace] --> B[Hub: MyApp-Prod]
    A --> C[Hub: MyApp-Dev]
    B --> D[APNs - iOS]
    B --> E[FCM - Android]
    B --> F[WNS - Windows]
    C --> G[APNs Sandbox - iOS]
    C --> H[FCM - Android]
```

## Provider and Variables

```hcl
# Terraform configuration
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

variable "location" {
  type    = string
  default = "eastus2"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "app_name" {
  type    = string
  default = "myapp"
}

# Platform notification credentials (sensitive)
variable "apns_bundle_id" {
  type        = string
  description = "Apple app bundle identifier"
}

variable "apns_key_id" {
  type        = string
  description = "Apple Push Notification key ID"
  sensitive   = true
}

variable "apns_team_id" {
  type        = string
  description = "Apple Developer Team ID"
  sensitive   = true
}

variable "apns_token" {
  type        = string
  description = "Apple Push Notification authentication token (p8 key content)"
  sensitive   = true
}

variable "fcm_server_key" {
  type        = string
  description = "Firebase Cloud Messaging server key"
  sensitive   = true
}

variable "wns_package_sid" {
  type        = string
  description = "Windows Notification Service package SID"
  sensitive   = true
  default     = ""
}

variable "wns_secret_key" {
  type        = string
  description = "Windows Notification Service secret key"
  sensitive   = true
  default     = ""
}

locals {
  name_prefix = "${var.app_name}-${var.environment}"
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Service     = "push-notifications"
  }
}
```

## Resource Group and Namespace

The namespace is the top-level container. The SKU determines the pricing tier and features.

```hcl
# Resource group
resource "azurerm_resource_group" "nh" {
  name     = "rg-${local.name_prefix}-notifications"
  location = var.location
  tags     = local.tags
}

# Notification Hub Namespace
resource "azurerm_notification_hub_namespace" "main" {
  name                = "nhns-${local.name_prefix}"
  resource_group_name = azurerm_resource_group.nh.name
  location            = azurerm_resource_group.nh.location
  namespace_type      = "NotificationHub"

  # SKU options: Free, Basic, Standard
  # Free: 500 devices, 1M pushes/month
  # Basic: 200K devices, 10M pushes/month
  # Standard: Unlimited devices, 10M pushes/month + telemetry + scheduled push
  sku_name = var.environment == "prod" ? "Standard" : "Free"

  # Enable for production environments
  enabled = true

  tags = local.tags
}
```

The Standard tier is worth the cost for production because it includes telemetry (so you can see delivery statistics), scheduled push notifications, and no device registration limit. The Free tier is fine for development and testing.

## Notification Hub with Platform Settings

Create the notification hub within the namespace and configure the platform notification credentials.

```hcl
# Notification Hub with platform notification settings
resource "azurerm_notification_hub" "main" {
  name                = "nh-${local.name_prefix}"
  namespace_name      = azurerm_notification_hub_namespace.main.name
  resource_group_name = azurerm_resource_group.nh.name
  location            = azurerm_resource_group.nh.location

  # Apple Push Notification Service (APNs) configuration
  # Using token-based authentication (recommended over certificate-based)
  apns_credential {
    application_mode = var.environment == "prod" ? "Production" : "Sandbox"
    bundle_id        = var.apns_bundle_id
    key_id           = var.apns_key_id
    team_id          = var.apns_team_id
    token            = var.apns_token
  }

  # Firebase Cloud Messaging (FCM) configuration
  # This uses the legacy server key; FCM v1 requires different setup
  gcm_credential {
    api_key = var.fcm_server_key
  }

  tags = local.tags
}

# Separate hub for development/testing with sandbox APNs
resource "azurerm_notification_hub" "dev" {
  count               = var.environment == "prod" ? 0 : 1
  name                = "nh-${var.app_name}-dev"
  namespace_name      = azurerm_notification_hub_namespace.main.name
  resource_group_name = azurerm_resource_group.nh.name
  location            = azurerm_resource_group.nh.location

  apns_credential {
    application_mode = "Sandbox"   # Always sandbox for dev hub
    bundle_id        = var.apns_bundle_id
    key_id           = var.apns_key_id
    team_id          = var.apns_team_id
    token            = var.apns_token
  }

  gcm_credential {
    api_key = var.fcm_server_key
  }

  tags = local.tags
}
```

The `application_mode` for APNs is important. Apple has separate endpoints for sandbox (development) and production push notifications. If you use the wrong mode, your notifications will silently fail.

## Authorization Rules

Notification Hubs use Shared Access Signature (SAS) policies for authentication. Create different policies for different use cases.

```hcl
# Full access policy for backend services
resource "azurerm_notification_hub_authorization_rule" "backend" {
  name                  = "BackendFullAccess"
  notification_hub_name = azurerm_notification_hub.main.name
  namespace_name        = azurerm_notification_hub_namespace.main.name
  resource_group_name   = azurerm_resource_group.nh.name

  manage = true    # Can manage registrations
  send   = true    # Can send notifications
  listen = true    # Can listen for registrations
}

# Send-only policy for the notification service
resource "azurerm_notification_hub_authorization_rule" "send_only" {
  name                  = "SendOnlyAccess"
  notification_hub_name = azurerm_notification_hub.main.name
  namespace_name        = azurerm_notification_hub_namespace.main.name
  resource_group_name   = azurerm_resource_group.nh.name

  manage = false
  send   = true    # Can only send, not manage registrations
  listen = false
}

# Listen-only policy for mobile apps (device registration)
resource "azurerm_notification_hub_authorization_rule" "listen_only" {
  name                  = "DeviceRegistration"
  notification_hub_name = azurerm_notification_hub.main.name
  namespace_name        = azurerm_notification_hub_namespace.main.name
  resource_group_name   = azurerm_resource_group.nh.name

  manage = false
  send   = false
  listen = true    # Devices can register but not send
}
```

The principle of least privilege applies here. Mobile apps should only get the `Listen` permission for registering devices. Your backend service gets `Send` permission. Only admin tools should have `Manage` permission.

## Storing Connection Strings in Key Vault

Rather than passing connection strings directly to your applications, store them in Key Vault.

```hcl
# Key Vault for storing notification hub connection strings
resource "azurerm_key_vault" "nh" {
  name                = "kv-${local.name_prefix}-nh"
  location            = azurerm_resource_group.nh.location
  resource_group_name = azurerm_resource_group.nh.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  enable_rbac_authorization = true

  tags = local.tags
}

data "azurerm_client_config" "current" {}

# Store the backend connection string
resource "azurerm_key_vault_secret" "nh_backend_connection" {
  name         = "nh-backend-connection-string"
  value        = azurerm_notification_hub_authorization_rule.backend.primary_access_key
  key_vault_id = azurerm_key_vault.nh.id

  depends_on = [
    azurerm_role_assignment.deployer_kv_admin
  ]
}

# Store the send-only connection string
resource "azurerm_key_vault_secret" "nh_send_connection" {
  name         = "nh-send-connection-string"
  value        = azurerm_notification_hub_authorization_rule.send_only.primary_access_key
  key_vault_id = azurerm_key_vault.nh.id

  depends_on = [
    azurerm_role_assignment.deployer_kv_admin
  ]
}

# Role assignment for the deployer
resource "azurerm_role_assignment" "deployer_kv_admin" {
  scope                = azurerm_key_vault.nh.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}
```

## Monitoring

Set up diagnostic settings to track notification delivery and failures.

```hcl
# Log Analytics for notification hub monitoring
resource "azurerm_log_analytics_workspace" "nh" {
  name                = "log-${local.name_prefix}-nh"
  location            = azurerm_resource_group.nh.location
  resource_group_name = azurerm_resource_group.nh.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

# Diagnostic settings for the namespace
resource "azurerm_monitor_diagnostic_setting" "nh_namespace" {
  name                       = "nh-diagnostics"
  target_resource_id         = azurerm_notification_hub_namespace.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.nh.id

  enabled_log {
    category = "OperationalLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Outputs

```hcl
output "namespace_id" {
  value       = azurerm_notification_hub_namespace.main.id
  description = "The Notification Hub Namespace resource ID"
}

output "hub_name" {
  value       = azurerm_notification_hub.main.name
  description = "The Notification Hub name"
}

output "namespace_name" {
  value       = azurerm_notification_hub_namespace.main.name
  description = "The namespace name for SDK configuration"
}

output "listen_connection_string" {
  value       = azurerm_notification_hub_authorization_rule.listen_only.primary_access_key
  sensitive   = true
  description = "Connection string for mobile app device registration"
}
```

## Deployment

```bash
# Create a tfvars file with platform credentials (do not commit this)
cat > notifications.tfvars << 'EOF'
apns_bundle_id = "com.yourcompany.yourapp"
apns_key_id    = "ABC123DEF4"
apns_team_id   = "TEAM123456"
apns_token     = "-----BEGIN PRIVATE KEY-----\nMIGT...your-key...ABC=\n-----END PRIVATE KEY-----"
fcm_server_key = "AAAAxyz123:APA91b...your-fcm-key..."
EOF

# Deploy with the credentials
terraform apply -var-file=notifications.tfvars
```

## Testing Notifications

After deployment, send a test notification using the Azure CLI.

```bash
# Send a test notification to iOS devices
az notification-hub test-send \
  --resource-group rg-myapp-prod-notifications \
  --namespace-name nhns-myapp-prod \
  --notification-hub-name nh-myapp-prod \
  --notification-format apple \
  --payload '{"aps":{"alert":"Test from Terraform deployment","sound":"default"}}'

# Send a test notification to Android devices
az notification-hub test-send \
  --resource-group rg-myapp-prod-notifications \
  --namespace-name nhns-myapp-prod \
  --notification-hub-name nh-myapp-prod \
  --notification-format gcm \
  --payload '{"notification":{"title":"Test","body":"From Terraform deployment"}}'
```

## Wrapping Up

Azure Notification Hubs with Terraform gives you a reproducible push notification infrastructure. The key decisions are the SKU tier (Standard for production), the APNs application mode (Production vs Sandbox), and the authorization rule granularity (separate policies for different access levels). With platform credentials stored securely and the hub properly configured, your mobile apps can register devices and your backend can send notifications through a single, scalable service.
