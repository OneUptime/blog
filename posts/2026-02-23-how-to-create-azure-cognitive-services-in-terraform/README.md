# How to Create Azure Cognitive Services in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Cognitive Services, AI, Infrastructure as Code, Machine Learning

Description: Learn how to provision Azure Cognitive Services accounts with Terraform, including individual AI services, multi-service accounts, and network security configuration.

---

Azure Cognitive Services (now part of Azure AI Services) provides pre-built AI capabilities that you can add to your applications without needing deep machine learning expertise. Need to analyze text sentiment, recognize objects in images, convert speech to text, or translate between languages? Cognitive Services has APIs for all of these and more.

Provisioning these services through Terraform lets you standardize how AI capabilities are deployed across your organization. You can control which services are available, enforce network security, manage access keys through Key Vault, and ensure every environment gets the same configuration.

## Understanding Azure Cognitive Services Types

Azure Cognitive Services can be deployed in two ways:

- **Multi-service account** (kind: `CognitiveServices`) - a single account that gives you access to multiple services like Vision, Language, and Speech under one endpoint and key.
- **Single-service accounts** - individual accounts for specific services like Computer Vision, Text Analytics, or Speech Services. These offer more granular control and sometimes have features not available in multi-service accounts.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
- Azure CLI authenticated

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {
    # Prevent accidental deletion of Cognitive Services accounts
    cognitive_account {
      purge_soft_delete_on_destroy = false
    }
  }
}
```

## Creating a Multi-Service Cognitive Services Account

```hcl
resource "azurerm_resource_group" "ai" {
  name     = "rg-ai-services-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Multi-service Cognitive Services account
resource "azurerm_cognitive_account" "multi_service" {
  name                = "cog-multi-prod-001"
  location            = azurerm_resource_group.ai.location
  resource_group_name = azurerm_resource_group.ai.name

  # CognitiveServices kind provides access to multiple AI services
  kind     = "CognitiveServices"
  sku_name = "S0"

  # Custom subdomain is required for Azure AD authentication
  custom_subdomain_name = "myorg-ai-prod"

  # Public network access
  public_network_access_enabled = true

  # Managed identity for secure access to other Azure resources
  identity {
    type = "SystemAssigned"
  }

  # Accept Microsoft's responsible AI terms
  # This must be set to true for the first deployment
  # custom_question_answering_search_service_id = azurerm_search_service.main.id

  tags = {
    Environment = "Production"
    Service     = "MultiService"
  }
}
```

## Creating Individual AI Service Accounts

### Computer Vision

```hcl
# Computer Vision for image analysis, OCR, and spatial analysis
resource "azurerm_cognitive_account" "computer_vision" {
  name                  = "cog-vision-prod-001"
  location              = azurerm_resource_group.ai.location
  resource_group_name   = azurerm_resource_group.ai.name
  kind                  = "ComputerVision"
  sku_name              = "S1"
  custom_subdomain_name = "myorg-vision-prod"

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
    Service     = "ComputerVision"
  }
}
```

### Language Service (Text Analytics)

```hcl
# Language service for sentiment analysis, NER, key phrases, etc.
resource "azurerm_cognitive_account" "language" {
  name                  = "cog-language-prod-001"
  location              = azurerm_resource_group.ai.location
  resource_group_name   = azurerm_resource_group.ai.name
  kind                  = "TextAnalytics"
  sku_name              = "S"
  custom_subdomain_name = "myorg-language-prod"

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
    Service     = "Language"
  }
}
```

### Speech Services

```hcl
# Speech service for speech-to-text, text-to-speech, and translation
resource "azurerm_cognitive_account" "speech" {
  name                  = "cog-speech-prod-001"
  location              = azurerm_resource_group.ai.location
  resource_group_name   = azurerm_resource_group.ai.name
  kind                  = "SpeechServices"
  sku_name              = "S0"
  custom_subdomain_name = "myorg-speech-prod"

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
    Service     = "Speech"
  }
}
```

### Translator

```hcl
# Translator service for text and document translation
resource "azurerm_cognitive_account" "translator" {
  name                = "cog-translator-prod-001"
  location            = "global" # Translator uses global region
  resource_group_name = azurerm_resource_group.ai.name
  kind                = "TextTranslation"
  sku_name            = "S1"

  tags = {
    Environment = "Production"
    Service     = "Translator"
  }
}
```

### Azure OpenAI Service

```hcl
# Azure OpenAI Service for GPT models
resource "azurerm_cognitive_account" "openai" {
  name                  = "cog-openai-prod-001"
  location              = "eastus" # Check regional availability
  resource_group_name   = azurerm_resource_group.ai.name
  kind                  = "OpenAI"
  sku_name              = "S0"
  custom_subdomain_name = "myorg-openai-prod"

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
    Service     = "OpenAI"
  }
}

# Deploy a GPT model within the OpenAI account
resource "azurerm_cognitive_deployment" "gpt4" {
  name                 = "gpt-4"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = "gpt-4"
    version = "0613"
  }

  scale {
    type     = "Standard"
    capacity = 10 # Tokens per minute in thousands
  }
}

# Deploy an embedding model
resource "azurerm_cognitive_deployment" "embedding" {
  name                 = "text-embedding-ada-002"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format  = "OpenAI"
    name    = "text-embedding-ada-002"
    version = "2"
  }

  scale {
    type     = "Standard"
    capacity = 30
  }
}
```

## Network Security

Lock down access to your Cognitive Services accounts:

```hcl
# Virtual network for private access
resource "azurerm_virtual_network" "ai" {
  name                = "vnet-ai-prod"
  location            = azurerm_resource_group.ai.location
  resource_group_name = azurerm_resource_group.ai.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "ai_services" {
  name                 = "snet-ai-services"
  resource_group_name  = azurerm_resource_group.ai.name
  virtual_network_name = azurerm_virtual_network.ai.name
  address_prefixes     = ["10.0.1.0/24"]

  service_endpoints = ["Microsoft.CognitiveServices"]
}

# Cognitive Services with network restrictions
resource "azurerm_cognitive_account" "secure_vision" {
  name                  = "cog-vision-secure-001"
  location              = azurerm_resource_group.ai.location
  resource_group_name   = azurerm_resource_group.ai.name
  kind                  = "ComputerVision"
  sku_name              = "S1"
  custom_subdomain_name = "myorg-vision-secure"

  # Disable public access
  public_network_access_enabled = false

  # Network rules
  network_acls {
    default_action = "Deny"

    # Allow access from specific subnet
    virtual_network_rules {
      subnet_id = azurerm_subnet.ai_services.id
    }

    # Allow specific IP addresses
    ip_rules = ["203.0.113.0/24"]
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = "Production"
  }
}
```

## Storing Keys in Key Vault

Never expose Cognitive Services keys directly in application configuration:

```hcl
data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "ai" {
  name                = "kv-ai-prod-001"
  location            = azurerm_resource_group.ai.location
  resource_group_name = azurerm_resource_group.ai.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = ["Get", "List", "Set", "Delete", "Purge"]
  }
}

# Store the primary key in Key Vault
resource "azurerm_key_vault_secret" "vision_key" {
  name         = "cognitive-vision-key"
  value        = azurerm_cognitive_account.computer_vision.primary_access_key
  key_vault_id = azurerm_key_vault.ai.id
}

# Store the endpoint in Key Vault
resource "azurerm_key_vault_secret" "vision_endpoint" {
  name         = "cognitive-vision-endpoint"
  value        = azurerm_cognitive_account.computer_vision.endpoint
  key_vault_id = azurerm_key_vault.ai.id
}
```

## Outputs

```hcl
output "multi_service_endpoint" {
  description = "Multi-service Cognitive Services endpoint"
  value       = azurerm_cognitive_account.multi_service.endpoint
}

output "multi_service_key" {
  description = "Multi-service Cognitive Services primary key"
  value       = azurerm_cognitive_account.multi_service.primary_access_key
  sensitive   = true
}

output "openai_endpoint" {
  description = "Azure OpenAI endpoint"
  value       = azurerm_cognitive_account.openai.endpoint
}

output "vision_endpoint" {
  description = "Computer Vision endpoint"
  value       = azurerm_cognitive_account.computer_vision.endpoint
}
```

## Best Practices

**Use multi-service accounts when possible.** If you need multiple AI capabilities, a single multi-service account simplifies key management and billing. Only use individual accounts when you need service-specific features or different network configurations.

**Choose the right SKU and region.** Not all services are available in all regions, and pricing varies. Check the Azure Cognitive Services pricing page for your specific services.

**Implement network security from day one.** Use private endpoints or virtual network service endpoints to restrict access. Public endpoints are fine for development but should be locked down in production.

**Use Azure AD authentication over keys.** While key-based authentication is simpler to set up, Azure AD with managed identities is more secure and does not require key rotation.

**Monitor usage and set budgets.** Cognitive Services can generate significant costs at scale, especially for services like OpenAI. Use Azure Cost Management to track spending and set alerts.

**Handle soft-delete.** Cognitive Services accounts are soft-deleted by default. Be aware that you cannot reuse a name until the soft-deleted account is purged. Set the `purge_soft_delete_on_destroy` provider feature appropriately for your environment.

## Conclusion

Azure Cognitive Services with Terraform makes it straightforward to provision AI capabilities as part of your infrastructure pipeline. Whether you need a simple multi-service account for experimenting with AI features or a production-grade setup with Azure OpenAI, network isolation, and Key Vault integration, Terraform handles the full lifecycle. The key is choosing the right service types for your use case and building in proper security from the start.
