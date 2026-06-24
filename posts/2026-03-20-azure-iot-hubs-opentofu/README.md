# How to Create Azure IoT Hubs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, IoT Hub, IoT, Device Management, Infrastructure as Code

Description: Learn how to create Azure IoT Hubs, configure device endpoints, and set up message routing to Event Hubs and Storage using OpenTofu.

## Introduction

Azure IoT Hub is a managed service for bidirectional communication between IoT devices and cloud applications. OpenTofu manages IoT Hub creation, shared access policies, message routing, and consumer groups as code.

## Creating an IoT Hub

```hcl
resource "azurerm_resource_group" "iot" {
  name     = "rg-iot-${var.environment}"
  location = var.location
}

resource "azurerm_iothub" "main" {
  name                = "iot-${var.app_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.iot.name
  location            = azurerm_resource_group.iot.location

  sku {
    name     = "S1"      # S1 supports 400,000 messages/day; use S3 for large fleets
    capacity = 1
  }

  # Default message retention (1-7 days)
  event_hub_retention_in_days = 1
  event_hub_partition_count   = 4

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Shared Access Policies

```hcl
resource "azurerm_iothub_shared_access_policy" "device_connect" {
  name                = "device-connect"
  resource_group_name = azurerm_resource_group.iot.name
  iothub_name         = azurerm_iothub.main.name

  registry_read   = true
  registry_write  = false
  service_connect = false
  device_connect  = true
}

resource "azurerm_iothub_shared_access_policy" "backend_service" {
  name                = "backend-service"
  resource_group_name = azurerm_resource_group.iot.name
  iothub_name         = azurerm_iothub.main.name

  registry_read   = true
  registry_write  = true
  service_connect = true
  device_connect  = false
}
```

## Consumer Groups

```hcl
# Separate consumer groups for different processing pipelines

resource "azurerm_iothub_consumer_group" "analytics" {
  name                   = "analytics"
  iothub_name            = azurerm_iothub.main.name
  eventhub_endpoint_name = "events"
  resource_group_name    = azurerm_resource_group.iot.name
}

resource "azurerm_iothub_consumer_group" "alerting" {
  name                   = "alerting"
  iothub_name            = azurerm_iothub.main.name
  eventhub_endpoint_name = "events"
  resource_group_name    = azurerm_resource_group.iot.name
}
```

## Message Routing to Storage

```hcl
resource "azurerm_storage_account" "iot_data" {
  name                     = "stiothub${var.environment}"
  resource_group_name      = azurerm_resource_group.iot.name
  location                 = azurerm_resource_group.iot.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "telemetry" {
  name                  = "telemetry"
  storage_account_id    = azurerm_storage_account.iot_data.id
  container_access_type = "private"
}

resource "azurerm_iothub_endpoint_storage_container" "telemetry" {
  resource_group_name = azurerm_resource_group.iot.name
  iothub_id           = azurerm_iothub.main.id
  name                = "telemetry-storage"

  connection_string          = azurerm_storage_account.iot_data.primary_blob_connection_string
  batch_frequency_in_seconds = 60
  max_chunk_size_in_bytes    = 10485760  # 10 MB
  container_name             = azurerm_storage_container.telemetry.name
  encoding                   = "JSON"
  file_name_format           = "{iothub}/{partition}/{YYYY}/{MM}/{DD}/{HH}/{mm}"
}

resource "azurerm_iothub_route" "telemetry" {
  resource_group_name = azurerm_resource_group.iot.name
  iothub_name         = azurerm_iothub.main.name
  name                = "telemetry-storage"

  source         = "DeviceMessages"
  condition      = "true"
  endpoint_names = [azurerm_iothub_endpoint_storage_container.telemetry.name]
  enabled        = true
}
```

## Variables and Outputs

```hcl
variable "app_name"    { type = string }
variable "environment" { type = string }
variable "location"    { type = string  default = "East US" }

output "iothub_hostname" {
  value = azurerm_iothub.main.hostname
}

output "service_connection_string" {
  value     = azurerm_iothub_shared_access_policy.backend_service.primary_connection_string
  sensitive = true
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure IoT Hub provides reliable, secure device connectivity at scale. OpenTofu manages the hub, shared access policies, consumer groups on the built-in Event Hubs-compatible endpoint, and storage routing endpoints and routes - creating a complete, code-driven IoT backend infrastructure.
