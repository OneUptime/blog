# How to Create Azure API Management Services with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, API Management, APIM, API Gateway, Infrastructure as Code

Description: Learn how to create and configure Azure API Management services with OpenTofu, including named values, products, subscriptions, and backend configurations for enterprise API management.

Azure API Management (APIM) is a fully managed API gateway that handles routing, authentication, rate limiting, caching, and transformation for all your APIs. Managing APIM in OpenTofu ensures consistent gateway configuration, policy enforcement, and developer portal settings across environments.

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## API Management Service

```hcl
resource "azurerm_api_management" "main" {
  name                = "production-apim"
  location            = var.location
  resource_group_name = azurerm_resource_group.apim.name
  publisher_name      = "ACME Corp"
  publisher_email     = "api-team@example.com"

  sku_name = "Premium_1"  # <Tier>_<Capacity>, for example Developer_1, Standard_1, Premium_1

  # VNet injection for supported classic tiers such as Premium
  virtual_network_type = "Internal"  # Internal, External, or None

  # If APIM uses Key Vault-backed secrets or certificates in a VNet,
  # allow subnet egress to AzureKeyVault and AzureActiveDirectory.
  virtual_network_configuration {
    subnet_id = azurerm_subnet.apim.id
  }

  identity {
    type = "SystemAssigned"  # Managed identity for Key Vault access
  }

  # Custom hostname configuration
  hostname_configuration {
    proxy {
      host_name                    = "api.${var.domain_name}"
      key_vault_certificate_id     = azurerm_key_vault_certificate.gateway.versionless_secret_id
      negotiate_client_certificate = false
    }
  }

  tags = {
    Environment = var.environment
  }
}
```

## Named Values (Configuration Variables)

```hcl
# Store configuration values referenced in policies

resource "azurerm_api_management_named_value" "backend_url" {
  name                = "backend-url"
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  display_name        = "Backend URL"
  value               = "https://backend.internal.example.com"
}

# Secret named value (stored securely in Key Vault)
resource "azurerm_api_management_named_value" "api_key" {
  name                = "backend-api-key"
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  display_name        = "Backend API Key"
  secret              = true  # Mark as secret in APIM

  value_from_key_vault {
    secret_id = azurerm_key_vault_secret.backend_api_key.resource_versionless_id
  }
}
```

## Products and Subscriptions

```hcl
# Products group APIs and define access tiers
resource "azurerm_api_management_product" "starter" {
  product_id            = "starter"
  api_management_name   = azurerm_api_management.main.name
  resource_group_name   = azurerm_resource_group.apim.name
  display_name          = "Starter Plan"
  description           = "Limited access for developers"
  subscription_required = true
  approval_required     = false
  published             = true

  # Rate limits applied via product policy
  subscriptions_limit = 100
}

resource "azurerm_api_management_product" "enterprise" {
  product_id            = "enterprise"
  api_management_name   = azurerm_api_management.main.name
  resource_group_name   = azurerm_resource_group.apim.name
  display_name          = "Enterprise Plan"
  description           = "Unlimited access for enterprise customers"
  subscription_required = true
  approval_required     = true  # Manual approval required
  published             = true
}

# Product policy - apply rate limiting to Starter plan
resource "azurerm_api_management_product_policy" "starter" {
  product_id          = azurerm_api_management_product.starter.product_id
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name

  xml_content = <<-XML
    <policies>
      <inbound>
        <rate-limit calls="100" renewal-period="60" />
        <quota calls="10000" renewal-period="604800" />
        <base />
      </inbound>
      <backend>
        <base />
      </backend>
      <outbound>
        <base />
      </outbound>
    </policies>
  XML
}
```

## Backend Configuration

```hcl
# Define backend service
resource "azurerm_api_management_backend" "users_service" {
  name                = "users-service"
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  description         = "Users microservice backend"
  protocol            = "http"
  url                 = "https://users-service.internal.example.com"

  tls {
    validate_certificate_chain = true
    validate_certificate_name  = true
  }

  credentials {
    header = {
      X-API-Key = "{{backend-api-key}}"  # References named value
    }
  }
}
```

## Diagnostic Settings and Logging

```hcl
# Send APIM telemetry to Application Insights
resource "azurerm_api_management_logger" "app_insights" {
  name                = "app-insights-logger"
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name

  application_insights {
    instrumentation_key = azurerm_application_insights.main.instrumentation_key
  }
}

resource "azurerm_api_management_diagnostic" "main" {
  identifier               = "applicationinsights"
  api_management_name      = azurerm_api_management.main.name
  resource_group_name      = azurerm_resource_group.apim.name
  api_management_logger_id = azurerm_api_management_logger.app_insights.id

  sampling_percentage       = 100.0  # Log 100% of requests
  always_log_errors         = true
  log_client_ip             = true
  verbosity                 = "information"

  frontend_request {
    body_bytes = 0  # Don't log request bodies (privacy)
  }

  backend_request {
    body_bytes = 0
  }
}
```

## Conclusion

Azure API Management in OpenTofu provides enterprise-grade API governance across all your services. Use Named Values to centralize configuration referenced in policies, Products to define API access tiers, product policies to apply rate limiting, and Backends to manage upstream service connections with credential injection. Enable Application Insights logging for full request/response tracing, and use system-assigned managed identity to access Key Vault secrets without storing credentials in configuration.
