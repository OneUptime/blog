# How to Create Azure API Management in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, API Management, APIM, Infrastructure as Code, API Gateway

Description: A hands-on guide to provisioning Azure API Management with Terraform, including APIs, products, policies, subscriptions, and developer portal configuration.

---

Azure API Management (APIM) is Microsoft's fully managed service for publishing, securing, transforming, maintaining, and monitoring APIs. It sits between your API consumers and your backend services, handling things like authentication, rate limiting, caching, request transformation, and analytics. Whether you are exposing internal microservices to external partners or building a public API platform, APIM gives you centralized control over your API surface.

Setting up APIM through Terraform is the right approach for production environments because the service has dozens of configuration options - APIs, operations, policies, products, subscriptions, certificates, and more. Clicking through the portal for all of that is tedious and error-prone. With Terraform, you declare what you want and let the tool handle the rest.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
- Azure CLI authenticated
- Some patience - APIM provisioning takes 30-45 minutes for Developer and Premium tiers

## Provider Setup

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
  features {}
}
```

## Creating the API Management Instance

```hcl
resource "azurerm_resource_group" "apim" {
  name     = "rg-apim-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
  }
}

# Create the APIM instance
resource "azurerm_api_management" "main" {
  name                = "apim-prod-001"
  location            = azurerm_resource_group.apim.location
  resource_group_name = azurerm_resource_group.apim.name

  publisher_name  = "My Organization"
  publisher_email = "api-admin@example.com"

  # Tier options: Consumption, Developer, Basic, Standard, Premium
  # Developer is good for non-production; Standard or Premium for production
  sku_name = "Developer_1"

  # Managed identity for accessing backend services securely
  identity {
    type = "SystemAssigned"
  }

  # Virtual network integration (optional)
  # virtual_network_type = "Internal" # or "External"

  # Minimum TLS version
  min_api_version = "2019-12-01"

  # Enable Application Insights integration
  # (configured separately below)

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}
```

## Configuring Application Insights Logger

```hcl
# Application Insights for API analytics
resource "azurerm_application_insights" "apim" {
  name                = "appi-apim-prod"
  location            = azurerm_resource_group.apim.location
  resource_group_name = azurerm_resource_group.apim.name
  application_type    = "web"
}

# Connect APIM to Application Insights
resource "azurerm_api_management_logger" "app_insights" {
  name                = "apim-logger-appinsights"
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  resource_id         = azurerm_application_insights.apim.id

  application_insights {
    instrumentation_key = azurerm_application_insights.apim.instrumentation_key
  }
}

# Enable diagnostics logging for all APIs
resource "azurerm_api_management_diagnostic" "app_insights" {
  identifier               = "applicationinsights"
  resource_group_name      = azurerm_resource_group.apim.name
  api_management_name      = azurerm_api_management.main.name
  api_management_logger_id = azurerm_api_management_logger.app_insights.id

  sampling_percentage = 100

  always_log_errors = true
  log_client_ip     = true
  verbosity         = "information"

  frontend_request {
    body_bytes = 32
    headers_to_log = [
      "Content-Type",
      "User-Agent",
      "X-Request-ID"
    ]
  }

  frontend_response {
    body_bytes = 32
    headers_to_log = [
      "Content-Type",
      "X-Request-ID"
    ]
  }

  backend_request {
    body_bytes = 32
    headers_to_log = [
      "Content-Type"
    ]
  }

  backend_response {
    body_bytes = 32
    headers_to_log = [
      "Content-Type"
    ]
  }
}
```

## Creating APIs

You can import APIs from OpenAPI specifications or define them manually:

```hcl
# Import an API from an OpenAPI specification
resource "azurerm_api_management_api" "orders" {
  name                  = "orders-api"
  resource_group_name   = azurerm_resource_group.apim.name
  api_management_name   = azurerm_api_management.main.name
  revision              = "1"
  display_name          = "Orders API"
  path                  = "orders"
  protocols             = ["https"]
  service_url           = "https://orders-backend.example.com"
  subscription_required = true

  import {
    content_format = "openapi+json"
    content_value  = file("${path.module}/specs/orders-api.json")
  }
}

# Define an API manually (without OpenAPI spec)
resource "azurerm_api_management_api" "users" {
  name                  = "users-api"
  resource_group_name   = azurerm_resource_group.apim.name
  api_management_name   = azurerm_api_management.main.name
  revision              = "1"
  display_name          = "Users API"
  path                  = "users"
  protocols             = ["https"]
  service_url           = "https://users-backend.example.com"
  subscription_required = true
}

# Define operations for the manually created API
resource "azurerm_api_management_api_operation" "get_users" {
  operation_id        = "get-users"
  api_name            = azurerm_api_management_api.users.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  display_name        = "Get Users"
  method              = "GET"
  url_template        = "/"
  description         = "Retrieves a list of users"

  response {
    status_code = 200
    description = "List of users"
  }
}

resource "azurerm_api_management_api_operation" "get_user_by_id" {
  operation_id        = "get-user-by-id"
  api_name            = azurerm_api_management_api.users.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  display_name        = "Get User by ID"
  method              = "GET"
  url_template        = "/{userId}"
  description         = "Retrieves a single user by their ID"

  template_parameter {
    name     = "userId"
    required = true
    type     = "string"
  }

  response {
    status_code = 200
    description = "User details"
  }

  response {
    status_code = 404
    description = "User not found"
  }
}
```

## Creating Products and Subscriptions

Products group APIs together and control access:

```hcl
# Create a product for external developers
resource "azurerm_api_management_product" "external" {
  product_id            = "external-apis"
  api_management_name   = azurerm_api_management.main.name
  resource_group_name   = azurerm_resource_group.apim.name
  display_name          = "External API Access"
  description           = "Access to public-facing APIs"
  subscription_required = true
  approval_required     = true
  published             = true

  # Limit subscriptions per user
  subscriptions_limit = 3
}

# Associate APIs with the product
resource "azurerm_api_management_product_api" "orders_external" {
  api_name            = azurerm_api_management_api.orders.name
  product_id          = azurerm_api_management_product.external.product_id
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
}

resource "azurerm_api_management_product_api" "users_external" {
  api_name            = azurerm_api_management_api.users.name
  product_id          = azurerm_api_management_product.external.product_id
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
}

# Create a subscription for a specific consumer
resource "azurerm_api_management_subscription" "partner_app" {
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  display_name        = "Partner Application"
  product_id          = azurerm_api_management_product.external.id
  state               = "active"
  allow_tracing       = false
}
```

## Applying Policies

Policies are the core of APIM. They let you transform requests, enforce rate limits, validate JWTs, and much more:

```hcl
# Global policy - applies to all APIs
resource "azurerm_api_management_policy" "global" {
  api_management_id = azurerm_api_management.main.id

  xml_content = <<XML
<policies>
  <inbound>
    <!-- Add correlation ID header if not present -->
    <set-header name="X-Request-ID" exists-action="skip">
      <value>@(context.RequestId.ToString())</value>
    </set-header>
    <!-- Rate limit by subscription key -->
    <rate-limit calls="1000" renewal-period="60" />
  </inbound>
  <backend>
    <forward-request />
  </backend>
  <outbound>
    <!-- Remove internal headers from responses -->
    <set-header name="X-Powered-By" exists-action="delete" />
    <set-header name="X-AspNet-Version" exists-action="delete" />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
XML
}

# API-level policy for the Orders API
resource "azurerm_api_management_api_policy" "orders" {
  api_name            = azurerm_api_management_api.orders.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name

  xml_content = <<XML
<policies>
  <inbound>
    <base />
    <!-- Validate JWT from Azure AD -->
    <validate-jwt header-name="Authorization" failed-validation-httpcode="401" require-scheme="Bearer">
      <openid-config url="https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration" />
      <audiences>
        <audience>api://orders-api</audience>
      </audiences>
      <required-claims>
        <claim name="roles" match="any">
          <value>Orders.Read</value>
          <value>Orders.Write</value>
        </claim>
      </required-claims>
    </validate-jwt>
    <!-- Cache responses for 5 minutes -->
    <cache-lookup vary-by-developer="false" vary-by-developer-groups="false" />
  </inbound>
  <backend>
    <forward-request />
  </backend>
  <outbound>
    <base />
    <cache-store duration="300" />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
XML
}
```

## Named Values (Configuration Properties)

Store configuration values that can be referenced in policies:

```hcl
# Plain text named value
resource "azurerm_api_management_named_value" "backend_url" {
  name                = "backend-url"
  resource_group_name = azurerm_resource_group.apim.name
  api_management_name = azurerm_api_management.main.name
  display_name        = "Backend URL"
  value               = "https://api-backend.example.com"
}

# Secret named value from Key Vault
resource "azurerm_api_management_named_value" "api_key" {
  name                = "backend-api-key"
  resource_group_name = azurerm_resource_group.apim.name
  api_management_name = azurerm_api_management.main.name
  display_name        = "Backend API Key"
  secret              = true

  value_from_key_vault {
    secret_id = "https://my-keyvault.vault.azure.net/secrets/backend-api-key"
  }
}
```

## Best Practices

**Start with Developer tier and upgrade.** The Developer tier has the same features as Premium but without the SLA. Use it for development and testing, then move to Standard or Premium for production.

**Use policies for cross-cutting concerns.** Do not implement rate limiting, authentication, or CORS in your backend services when APIM can handle it. This keeps your backends focused on business logic.

**Version your APIs.** Use APIM's built-in versioning and revision features. Define API versions in Terraform so you can maintain backward compatibility.

**Store sensitive values in Key Vault.** Never hardcode API keys or secrets in Terraform files or APIM named values. Use Key Vault references.

**Monitor everything.** The Application Insights integration provides deep visibility into API usage, latency, and errors. Set up alerts for error rate spikes and latency increases.

## Conclusion

Azure API Management with Terraform gives you a comprehensive, code-driven approach to API governance. From basic API proxying to advanced scenarios with JWT validation, rate limiting, and response caching, Terraform handles the full APIM configuration lifecycle. The initial setup takes some effort, but the payoff is a reproducible, auditable API platform that scales with your organization's needs.
