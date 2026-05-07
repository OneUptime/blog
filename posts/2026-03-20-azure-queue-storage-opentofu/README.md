# How to Create Azure Queue Storage with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Storage, Queue, OpenTofu, Messaging, Infrastructure

Description: Learn how to create and configure Azure Queue Storage with OpenTofu for reliable asynchronous messaging between application components.

## Overview

Azure Queue Storage provides a simple, cost-effective message queuing service for decoupling application components. Messages can be up to 64KB each, and queues can hold millions of messages. OpenTofu makes it easy to manage queues as part of your infrastructure code.

## Step 1: Create the Storage Account

```hcl
# main.tf - Storage account for queue storage

resource "azurerm_resource_group" "rg" {
  name     = "my-queue-rg"
  location = "eastus"
}

resource "azurerm_storage_account" "storage" {
  name                     = "myqueuestorage"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # Queue properties for logging and metrics
  queue_properties {
    logging {
      delete                = true
      read                  = true
      write                 = true
      version               = "1.0"
      retention_policy_days = 7
    }

    hour_metrics {
      enabled               = true
      include_apis          = true
      version               = "1.0"
      retention_policy_days = 7
    }

    minute_metrics {
      enabled               = true
      include_apis          = true
      version               = "1.0"
      retention_policy_days = 7
    }
  }
}
```

## Step 2: Create Queues

```hcl
# Create individual queues for different workloads
resource "azurerm_storage_queue" "order_queue" {
  name                 = "order-processing"
  storage_account_id   = azurerm_storage_account.storage.id

  # Set metadata for queue identification
  metadata = {
    purpose     = "order-processing"
    environment = "production"
  }
}

resource "azurerm_storage_queue" "notification_queue" {
  name                 = "notifications"
  storage_account_id   = azurerm_storage_account.storage.id

  metadata = {
    purpose = "email-notifications"
  }
}

resource "azurerm_storage_queue" "dead_letter_queue" {
  name                 = "order-processing-dlq"
  storage_account_id   = azurerm_storage_account.storage.id

  metadata = {
    purpose = "dead-letter-queue-for-orders"
  }
}
```

## Step 3: Create Multiple Queues with for_each

```hcl
# Define queue configurations in a map
locals {
  queues = {
    "email-queue"      = { purpose = "email delivery" }
    "sms-queue"        = { purpose = "sms delivery" }
    "push-queue"       = { purpose = "push notifications" }
    "audit-log-queue"  = { purpose = "audit logging" }
  }
}

resource "azurerm_storage_queue" "queues" {
  for_each = local.queues

  name                 = each.key
  storage_account_id   = azurerm_storage_account.storage.id

  metadata = {
    purpose = each.value.purpose
  }
}
```

## Step 4: IAM Role Assignments for Queue Access

```hcl
# Grant an application managed identity permission to send/receive messages
resource "azurerm_role_assignment" "queue_contributor" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = var.app_managed_identity_principal_id
}

# Grant a separate consumer service read-only message access
resource "azurerm_role_assignment" "queue_reader" {
  scope                = azurerm_storage_account.storage.id
  role_definition_name = "Storage Queue Data Reader"
  principal_id         = var.consumer_service_principal_id
}
```

## Step 5: Outputs

```hcl
output "queue_endpoint" {
  value       = azurerm_storage_account.storage.primary_queue_endpoint
  description = "Primary queue service endpoint"
}

output "queue_names" {
  value = [for q in azurerm_storage_queue.queues : q.name]
}
```

## Summary

Azure Queue Storage managed with OpenTofu provides reliable asynchronous messaging infrastructure. By defining queues as code, you ensure consistent queue configurations across environments and can easily add dead-letter queues, monitoring, and appropriate IAM permissions for producers and consumers.
