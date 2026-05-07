# How to Create Azure Communication Services with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Communication Services, SMS, Email, Infrastructure as Code

Description: Learn how to provision Azure Communication Services resources including SMS, email, and chat capabilities using OpenTofu.

## Introduction

Azure Communication Services (ACS) is a cloud platform for adding real-time communication features (voice, video, chat, SMS, email) to applications. OpenTofu lets you provision and configure ACS resources consistently across environments.

## Creating an ACS Resource

```hcl
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "rg-communication-${var.environment}"
  location = var.location
}

resource "azurerm_communication_service" "main" {
  name                = "acs-${var.app_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name

  # Data residency location (separate from Azure region)
  data_location = "United States"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Creating an Email Communication Service

ACS Email is a separate resource that handles email delivery.

```hcl
resource "azurerm_email_communication_service" "main" {
  name                = "ecs-${var.app_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  data_location       = "United States"
}
```

## Adding a Custom Domain

Create a customer-managed domain for your Email Communication Service. Azure returns DNS verification records that you must publish before using the domain for email.

```hcl
resource "azurerm_email_communication_service_domain" "custom" {
  name              = "mail.example.com"
  email_service_id  = azurerm_email_communication_service.main.id

  # Use "CustomerManaged" for your own domain
  domain_management = "CustomerManaged"
}
```

## Linking Email to Communication Service

```hcl
resource "azurerm_communication_service_email_domain_association" "main" {
  communication_service_id = azurerm_communication_service.main.id
  email_service_domain_id  = azurerm_email_communication_service_domain.custom.id
}
```

## Event Grid Integration

Route ACS SMS events to Event Grid for downstream processing.

```hcl
resource "azurerm_eventgrid_event_subscription" "acs_events" {
  name  = "acs-event-subscription"
  scope = azurerm_communication_service.main.id

  event_delivery_schema = "EventGridSchema"

  included_event_types = [
    "Microsoft.Communication.SMSReceived",
    "Microsoft.Communication.SMSDeliveryReportReceived",
  ]

  webhook_endpoint {
    url = var.webhook_url
  }
}
```

## Variables and Outputs

```hcl
variable "app_name"    { type = string }
variable "environment" { type = string }
variable "location"    { type = string  default = "East US" }
variable "webhook_url" { type = string }

output "connection_string" {
  description = "ACS connection string for SDK initialization"
  value       = azurerm_communication_service.main.primary_connection_string
  sensitive   = true
}

output "acs_resource_id" {
  value = azurerm_communication_service.main.id
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure Communication Services provides a unified platform for SMS, email, chat, and calling. Using OpenTofu you can provision ACS resources, configure email domains, and wire up Event Grid subscriptions for event-driven communication workflows - all from version-controlled configuration.
