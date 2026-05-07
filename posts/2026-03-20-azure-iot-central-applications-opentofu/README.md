# How to Create Azure IoT Central Applications with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, IoT Central, IoT, SaaS Platform, Infrastructure as Code

Description: Learn how to provision Azure IoT Central applications for no-code IoT device management and monitoring using OpenTofu.

## Introduction

Azure IoT Central is a fully managed IoT application platform that provides device connectivity, data visualization, rules, and analytics without requiring deep cloud expertise. OpenTofu manages IoT Central application creation and access control as code.

## Creating an IoT Central Application

```hcl
resource "azurerm_resource_group" "iot" {
  name     = "rg-iot-central-${var.environment}"
  location = var.location
}

resource "azurerm_iotcentral_application" "main" {
  name                = "iotc-${var.app_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.iot.name
  location            = azurerm_resource_group.iot.location

  # Application subdomain URL: https://{sub_domain}.azureiotcentral.com
  sub_domain = "${var.app_name}-${var.environment}"

  display_name = "${var.app_name} IoT Platform"

  # SKU: ST0, ST1, ST2
  sku = "ST1"

  # Use a public template (optional)
  template = "iotc-pnp-preview@1.0.0"

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Network Access Rules

```hcl
resource "azurerm_iotcentral_application_network_rule_set" "main" {
  iotcentral_application_id = azurerm_iotcentral_application.main.id

  # Default action for requests not matching any rule
  apply_to_device = true
  default_action   = "Deny"

  ip_rule {
    name    = "corporate-office"
    ip_mask = var.corporate_ip_range
  }

  ip_rule {
    name    = "vpn-gateway"
    ip_mask = var.vpn_ip_range
  }
}
```

## Managed Identity for Data Export

IoT Central can export data to Event Hubs or Blob Storage. Grant the application's managed identity access to the target.

```hcl
resource "azurerm_eventhub_namespace" "export" {
  name                = "evhns-iot-export-${var.environment}"
  location            = azurerm_resource_group.iot.location
  resource_group_name = azurerm_resource_group.iot.name
  sku                 = "Standard"
}

resource "azurerm_eventhub" "telemetry" {
  name              = "telemetry"
  namespace_id      = azurerm_eventhub_namespace.export.id
  partition_count   = 4
  message_retention = 1
}

# Grant IoT Central system identity access to send to Event Hub

resource "azurerm_role_assignment" "iotc_eventhub" {
  scope                = azurerm_eventhub.telemetry.id
  role_definition_name = "Azure Event Hubs Data Sender"
  principal_id         = azurerm_iotcentral_application.main.identity[0].principal_id
}
```

## Variables and Outputs

```hcl
variable "app_name"          { type = string }
variable "environment"       { type = string }
variable "location"          { type = string  default = "East US" }
variable "corporate_ip_range"{ type = string }
variable "vpn_ip_range"      { type = string }

output "application_url" {
  description = "IoT Central application URL"
  value       = "https://${azurerm_iotcentral_application.main.sub_domain}.azureiotcentral.com"
}

output "application_id" {
  value = azurerm_iotcentral_application.main.id
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure IoT Central simplifies IoT device management with a managed application platform. OpenTofu provisions the application, configures network access rules, and sets up managed identity permissions for data export to Event Hubs - enabling consistent IoT platform deployments across environments.
