# How to Create Azure Communication Services in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Communication Services, SMS, Email, Infrastructure as Code, Voice

Description: Learn how to create and configure Azure Communication Services with Terraform for adding SMS, email, voice, and chat capabilities to your applications.

---

Building communication features into your applications usually means integrating with third-party services like Twilio or SendGrid. Azure Communication Services (ACS) offers a first-party alternative that lives in your Azure environment, inherits your existing security controls, and integrates natively with other Azure services like Azure Functions and Logic Apps.

This guide covers setting up Azure Communication Services with Terraform, including email capabilities, phone numbers, and the infrastructure you need around it.

## What Azure Communication Services Offers

ACS provides several communication channels:

- **SMS**: Send and receive text messages
- **Voice and video calling**: Build calling experiences into web and mobile apps
- **Chat**: Real-time messaging between users
- **Email**: Send transactional and bulk emails
- **Phone numbers**: Purchase and manage phone numbers for SMS and voice

Not all of these features are managed through Terraform. The ACS resource itself is created with Terraform, but some features like phone number management are handled through the ACS APIs or portal.

## Creating the Communication Service

Start with the base resource:

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

# Resource group for communication services
resource "azurerm_resource_group" "comms" {
  name     = "rg-communication-prod"
  location = "East US"

  tags = {
    environment = "production"
    purpose     = "communication-services"
  }
}

# Azure Communication Service
resource "azurerm_communication_service" "main" {
  name                = "acs-prod-contoso"
  resource_group_name = azurerm_resource_group.comms.name

  # Data location determines where your data is stored
  # Options: United States, Europe, UK, Australia, Japan, etc.
  data_location = "United States"

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

The `data_location` parameter controls where your communication data (messages, call metadata, etc.) is stored. Choose a location that meets your compliance requirements. Note that Communication Services is a global resource - the `location` of the resource group does not determine where the service runs, but `data_location` determines where your data resides.

## Setting Up Email Communication

Email requires an Email Communication Service resource linked to the main Communication Service:

```hcl
# Email Communication Service
resource "azurerm_email_communication_service" "main" {
  name                = "emailcs-prod-contoso"
  resource_group_name = azurerm_resource_group.comms.name

  # Data location for email data
  data_location = "United States"

  tags = {
    environment = "production"
  }
}

# Azure-managed domain for email (quick setup, no DNS configuration needed)
resource "azurerm_email_communication_service_domain" "azure_managed" {
  name             = "AzureManagedDomain"
  email_service_id = azurerm_email_communication_service.main.id

  # AzureManaged means Azure provides the sending domain
  domain_management = "AzureManaged"
}

# Link the email service to the communication service
resource "azurerm_communication_service_email_domain_association" "main" {
  communication_service_id = azurerm_communication_service.main.id
  email_service_domain_id  = azurerm_email_communication_service_domain.azure_managed.id
}
```

With an Azure-managed domain, you get a sending domain like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.azurecomm.net`. This works for testing and development, but for production, you probably want a custom domain.

## Custom Email Domain

For a professional email setup with your own domain:

```hcl
# Custom domain for email
resource "azurerm_email_communication_service_domain" "custom" {
  name             = "contoso.com"
  email_service_id = azurerm_email_communication_service.main.id

  # CustomerManaged means you provide and verify the domain
  domain_management = "CustomerManaged"

  tags = {
    environment = "production"
  }
}
```

After creating the custom domain resource, you need to verify it by adding DNS records. The verification records are available in the Azure portal or through the API. You will need to add:
- SPF record for sender verification
- DKIM records for email signing
- DMARC record for email authentication policy

## Storing Connection Strings Securely

The communication service connection string is sensitive. Store it in Key Vault:

```hcl
# Store the connection string in Key Vault
resource "azurerm_key_vault_secret" "acs_connection_string" {
  name         = "acs-connection-string"
  value        = azurerm_communication_service.main.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id

  tags = {
    service = "communication-services"
  }
}
```

## Integration with Azure Functions

A common pattern is to use Azure Functions as the backend for communication services:

```hcl
# Function App that handles communication logic
resource "azurerm_linux_function_app" "comms" {
  name                = "func-comms-prod"
  location            = azurerm_resource_group.comms.location
  resource_group_name = azurerm_resource_group.comms.name
  service_plan_id     = azurerm_service_plan.main.id

  storage_account_name       = azurerm_storage_account.functions.name
  storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  site_config {
    application_stack {
      node_version = "18"
    }
  }

  app_settings = {
    # Reference the connection string from Key Vault
    "ACS_CONNECTION_STRING" = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=acs-connection-string)"
  }

  # Use managed identity to access Key Vault
  identity {
    type = "SystemAssigned"
  }
}

# Grant the Function App access to Key Vault secrets
resource "azurerm_key_vault_access_policy" "function_app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = azurerm_linux_function_app.comms.identity[0].tenant_id
  object_id    = azurerm_linux_function_app.comms.identity[0].principal_id

  secret_permissions = [
    "Get",
  ]
}
```

## Event Grid Integration

Set up Event Grid to receive webhooks for incoming messages and delivery reports:

```hcl
# Event Grid system topic for Communication Services events
resource "azurerm_eventgrid_system_topic" "acs" {
  name                   = "evgt-acs-prod"
  resource_group_name    = azurerm_resource_group.comms.name
  location               = "Global"
  source_arm_resource_id = azurerm_communication_service.main.id
  topic_type             = "Microsoft.Communication.CommunicationServices"

  tags = {
    environment = "production"
  }
}

# Subscribe to SMS received events
resource "azurerm_eventgrid_system_topic_event_subscription" "sms_received" {
  name                = "sub-sms-received"
  system_topic        = azurerm_eventgrid_system_topic.acs.name
  resource_group_name = azurerm_resource_group.comms.name

  # Filter to only SMS received events
  included_event_types = [
    "Microsoft.Communication.SMSReceived",
  ]

  # Send events to the Function App
  azure_function_endpoint {
    function_id = "${azurerm_linux_function_app.comms.id}/functions/HandleSmsReceived"
  }
}

# Subscribe to email delivery report events
resource "azurerm_eventgrid_system_topic_event_subscription" "email_delivery" {
  name                = "sub-email-delivery"
  system_topic        = azurerm_eventgrid_system_topic.acs.name
  resource_group_name = azurerm_resource_group.comms.name

  included_event_types = [
    "Microsoft.Communication.EmailDeliveryReportReceived",
  ]

  azure_function_endpoint {
    function_id = "${azurerm_linux_function_app.comms.id}/functions/HandleEmailDelivery"
  }
}
```

## Diagnostic Settings

Monitor your communication service with diagnostic logs:

```hcl
resource "azurerm_monitor_diagnostic_setting" "acs" {
  name                       = "diag-acs"
  target_resource_id         = azurerm_communication_service.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id

  enabled_log {
    category = "ChatOperational"
  }

  enabled_log {
    category = "SMSOperational"
  }

  enabled_log {
    category = "AuthOperational"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Outputs

```hcl
# outputs.tf
output "communication_service_id" {
  description = "Resource ID of the Communication Service"
  value       = azurerm_communication_service.main.id
}

output "communication_service_name" {
  description = "Name of the Communication Service"
  value       = azurerm_communication_service.main.name
}

output "email_service_id" {
  description = "Resource ID of the Email Communication Service"
  value       = azurerm_email_communication_service.main.id
}

# Do not output connection strings - they should only be in Key Vault
```

## Best Practices

**Never expose connection strings.** Store them in Key Vault and access them through managed identities. Do not put them in app settings or environment variables in plain text.

**Use custom domains for production email.** Azure-managed domains work for testing but look unprofessional and are more likely to be flagged as spam.

**Set up delivery monitoring.** Email deliverability is not guaranteed. Monitor bounce rates and delivery reports through Event Grid.

**Plan for rate limits.** ACS has rate limits on SMS and email sending. Design your application to handle throttling and implement retry logic.

**Use separate ACS instances for production and development.** Phone numbers and email domains are tied to the ACS instance. You do not want test messages going out on your production phone number.

## Wrapping Up

Azure Communication Services provides SMS, email, voice, video, and chat capabilities that you can add to your applications without third-party dependencies. Terraform handles the infrastructure setup - creating the service, configuring email domains, setting up event subscriptions, and wiring up the security. The actual communication logic lives in your application code, but the foundation is managed as infrastructure as code alongside everything else in your Azure environment.
