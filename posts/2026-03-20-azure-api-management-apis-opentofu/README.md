# How to Create Azure API Management APIs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, API Management, APIM, API Policies, Infrastructure as Code

Description: Learn how to define APIs, operations, and policies in Azure API Management using OpenTofu, including OpenAPI imports, JWT validation, caching, and response transformation.

Once your APIM service is deployed, the next step is defining the APIs, operations, and policies that control how traffic flows through the gateway. Managing API definitions in OpenTofu keeps your API contract and policy configuration in version control alongside the infrastructure.

## API from OpenAPI Specification

```hcl
# Import an API from an OpenAPI spec file

resource "azurerm_api_management_api" "users" {
  name                = "users-api"
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  revision            = "1"
  display_name        = "Users API"
  description         = "API for user management operations"
  path                = "users"  # Base path: api.example.com/users
  protocols           = ["https"]

  subscription_required = true

  import {
    content_format = "openapi+json-link"
    content_value  = "https://raw.githubusercontent.com/your-org/api-specs/main/users-api.json"
  }
}

# Link the API to a product
resource "azurerm_api_management_product_api" "users_starter" {
  api_name            = azurerm_api_management_api.users.name
  product_id          = azurerm_api_management_product.starter.product_id
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
}
```

## Manually Defined API with Operations

```hcl
resource "azurerm_api_management_api" "orders" {
  name                = "orders-api"
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  revision            = "1"
  display_name        = "Orders API"
  path                = "orders"
  protocols           = ["https"]
}

# GET /orders operation
resource "azurerm_api_management_api_operation" "list_orders" {
  operation_id        = "list-orders"
  api_name            = azurerm_api_management_api.orders.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  display_name        = "List Orders"
  method              = "GET"
  url_template        = "/"
  description         = "Returns a paginated list of orders"

  request {
    query_parameter {
      name     = "page"
      required = false
      type     = "integer"
    }
    query_parameter {
      name     = "limit"
      required = false
      type     = "integer"
    }
  }

  response {
    status_code = 200
    description = "Successful response"
  }

  response {
    status_code = 401
    description = "Unauthorized"
  }
}

# POST /orders operation
resource "azurerm_api_management_api_operation" "create_order" {
  operation_id        = "create-order"
  api_name            = azurerm_api_management_api.orders.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  display_name        = "Create Order"
  method              = "POST"
  url_template        = "/"
}
```

## API-Level Policy (JWT Validation + Backend Routing)

```hcl
resource "azurerm_api_management_api_policy" "orders" {
  api_name            = azurerm_api_management_api.orders.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name

  xml_content = <<-XML
    <policies>
      <inbound>
        <!-- Validate JWT token -->
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401"
                      failed-validation-error-message="Unauthorized">
          <openid-config url="${var.oidc_config_url}" />
          <audiences>
            <audience>${var.api_audience}</audience>
          </audiences>
        </validate-jwt>

        <!-- Route to backend using a backend entity -->
        <set-backend-service backend-id="orders-service" />

        <!-- Add correlation ID for tracing -->
        <set-header name="X-Correlation-Id" exists-action="skip">
          <value>@(context.RequestId)</value>
        </set-header>

        <base />
      </inbound>
      <backend>
        <base />
      </backend>
      <outbound>
        <!-- Remove internal headers before returning to client -->
        <set-header name="X-Internal-Server" exists-action="delete" />

        <!-- Add caching headers -->
        <set-header name="Cache-Control" exists-action="override">
          <value>max-age=60</value>
        </set-header>
        <base />
      </outbound>
      <on-error>
        <base />
      </on-error>
    </policies>
  XML
}
```

## Operation-Level Policy with Caching

```hcl
resource "azurerm_api_management_api_operation_policy" "list_orders_cache" {
  api_name            = azurerm_api_management_api.orders.name
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  operation_id        = azurerm_api_management_api_operation.list_orders.operation_id

  xml_content = <<-XML
    <policies>
      <inbound>
        <!-- Cache authenticated GET /orders responses for 60 seconds per access token -->
        <cache-lookup vary-by-developer="false" vary-by-developer-groups="false"
                      allow-private-response-caching="true">
          <vary-by-header>Authorization</vary-by-header>
          <vary-by-query-parameter>page</vary-by-query-parameter>
          <vary-by-query-parameter>limit</vary-by-query-parameter>
        </cache-lookup>
        <base />
      </inbound>
      <backend>
        <base />
      </backend>
      <outbound>
        <cache-store duration="60" />
        <base />
      </outbound>
    </policies>
  XML
}
```

## API Version Set

```hcl
resource "azurerm_api_management_api_version_set" "orders" {
  name                = "orders-version-set"
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  display_name        = "Orders API"
  versioning_scheme   = "Header"  # Header, Segment, or Query
  version_header_name = "Api-Version"
}

# v1 of the API
resource "azurerm_api_management_api" "orders_v1" {
  name                = "orders-api-v1"
  api_management_name = azurerm_api_management.main.name
  resource_group_name = azurerm_resource_group.apim.name
  revision            = "1"
  version             = "v1"
  version_set_id      = azurerm_api_management_api_version_set.orders.id
  display_name        = "Orders API v1"
  path                = "orders"
  protocols           = ["https"]
}
```

## Conclusion

Azure API Management API definitions in OpenTofu let you manage the full API lifecycle - import from OpenAPI specs, define operations manually, and apply policies for authentication, caching, and response transformation. Use API-level policies for cross-cutting concerns like JWT validation and backend routing, and operation-level policies for specific behavior like caching GET endpoints. Version sets enable non-breaking API evolution with header or URL segment versioning for clients that need to migrate gradually.
