# How to Create Azure OpenAI Service with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, OpenAI, Generative AI, LLM, Infrastructure as Code

Description: Learn how to provision Azure OpenAI Service accounts, deploy models like GPT-4, and configure private endpoints using OpenTofu.

## Introduction

Azure OpenAI Service provides REST API access to OpenAI's models including GPT-4o, GPT-4o mini, embedding models, and image generation models. OpenTofu manages the Cognitive Services account, model deployments, and access policies as code.

## Creating the Azure OpenAI Resource

```hcl
resource "azurerm_resource_group" "ai" {
  name     = "rg-openai-${var.environment}"
  location = var.location
}

resource "azurerm_cognitive_account" "openai" {
  name                  = "aoai-${var.app_name}-${var.environment}"
  location              = azurerm_resource_group.ai.location
  resource_group_name   = azurerm_resource_group.ai.name
  kind                  = "OpenAI"
  sku_name              = "S0"

  # Required for network ACLs and private endpoints
  custom_subdomain_name = "${var.app_name}-${var.environment}"

  network_acls {
    default_action = "Deny"
    ip_rules       = var.allowed_ip_ranges
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Deploying Models

```hcl
# GPT-4o deployment for chat completions

resource "azurerm_cognitive_deployment" "gpt4o" {
  name                 = "gpt-4o"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format = "OpenAI"
    name   = "gpt-4o"
  }

  sku {
    name     = "Standard"
    capacity = 30  # tokens per minute (TPM) in thousands
  }
}

# GPT-4o mini for lower-cost use cases
resource "azurerm_cognitive_deployment" "gpt4o_mini" {
  name                 = "gpt-4o-mini"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format = "OpenAI"
    name   = "gpt-4o-mini"
  }

  sku {
    name     = "Standard"
    capacity = 100
  }
}

# Third-generation text embedding model
resource "azurerm_cognitive_deployment" "embedding" {
  name                 = "text-embedding-3-small"
  cognitive_account_id = azurerm_cognitive_account.openai.id

  model {
    format = "OpenAI"
    name   = "text-embedding-3-small"
  }

  sku {
    name     = "Standard"
    capacity = 50
  }
}
```

## Private Endpoint

```hcl
resource "azurerm_private_endpoint" "openai" {
  name                = "pe-openai-${var.environment}"
  location            = azurerm_resource_group.ai.location
  resource_group_name = azurerm_resource_group.ai.name
  subnet_id           = var.private_subnet_id

  private_service_connection {
    name                           = "psc-openai"
    private_connection_resource_id = azurerm_cognitive_account.openai.id
    subresource_names              = ["account"]
    is_manual_connection           = false
  }
}
```

## RBAC Access Control

```hcl
data "azurerm_client_config" "current" {}

# Grant current principal the Azure OpenAI user role
resource "azurerm_role_assignment" "openai_user" {
  scope                = azurerm_cognitive_account.openai.id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = data.azurerm_client_config.current.object_id
}
```

## Variables and Outputs

```hcl
variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "location" {
  type    = string
  default = "East US"
}

variable "allowed_ip_ranges" {
  type    = list(string)
  default = []
}

variable "private_subnet_id" {
  type = string
}

output "openai_endpoint" {
  value = azurerm_cognitive_account.openai.endpoint
}

output "openai_key" {
  value     = azurerm_cognitive_account.openai.primary_access_key
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

Azure OpenAI Service provides enterprise-grade access to chat and embedding models with private networking and Azure RBAC. OpenTofu manages the Cognitive Services account, model deployments at specified capacities, private endpoints, and access roles - creating a secure, reproducible AI infrastructure.
