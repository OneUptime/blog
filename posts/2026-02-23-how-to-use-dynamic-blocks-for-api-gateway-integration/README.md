# How to Use Dynamic Blocks for API Gateway Integration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, AWS, API Gateway, Serverless, Infrastructure as Code

Description: Learn how to use Terraform dynamic blocks to configure AWS API Gateway resources, methods, integrations, and responses from structured variable data.

---

AWS API Gateway is one of those services where Terraform configurations grow rapidly. Every API endpoint needs a resource, a method, an integration, and response mappings. When you have dozens of endpoints, dynamic blocks and `for_each` become essential for keeping the configuration manageable.

## The API Gateway Configuration Challenge

A single API endpoint in API Gateway (REST API) requires several Terraform resources:

- `aws_api_gateway_resource` for the URL path
- `aws_api_gateway_method` for the HTTP method
- `aws_api_gateway_integration` for the backend connection
- `aws_api_gateway_method_response` for response configuration
- `aws_api_gateway_integration_response` for response mapping

Multiply that by 20 endpoints and you have 100 resource blocks. Dynamic generation from variables is the only practical approach.

## Defining API Routes as Variables

Start with a structured variable that describes your API:

```hcl
variable "api_routes" {
  description = "API Gateway route configurations"
  type = map(object({
    path          = string
    http_method   = string
    authorization = optional(string, "NONE")
    authorizer_id = optional(string)

    # Integration settings
    integration_type = string  # "AWS_PROXY", "HTTP_PROXY", "MOCK"
    integration_uri  = optional(string)
    integration_http_method = optional(string, "POST")

    # Request parameters
    request_parameters = optional(map(bool), {})

    # Request models
    request_models = optional(map(string), {})

    # Response configurations
    responses = optional(list(object({
      status_code        = string
      response_models    = optional(map(string), {})
      response_parameters = optional(map(bool), {})
    })), [])
  }))
}
```

## Creating API Resources Dynamically

```hcl
# First, create the REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "my-api"
  description = "API managed with dynamic Terraform configuration"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Create path resources for each route
resource "aws_api_gateway_resource" "routes" {
  for_each = var.api_routes

  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = each.value.path
}

# Create methods for each route
resource "aws_api_gateway_method" "routes" {
  for_each = var.api_routes

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.routes[each.key].id
  http_method   = each.value.http_method
  authorization = each.value.authorization
  authorizer_id = each.value.authorizer_id

  # Dynamic request parameters
  request_parameters = each.value.request_parameters
  request_models     = each.value.request_models
}

# Create integrations for each route
resource "aws_api_gateway_integration" "routes" {
  for_each = var.api_routes

  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.routes[each.key].id
  http_method             = aws_api_gateway_method.routes[each.key].http_method
  type                    = each.value.integration_type
  integration_http_method = each.value.integration_type != "MOCK" ? each.value.integration_http_method : null
  uri                     = each.value.integration_uri
}
```

## Dynamic Method Responses

Each route can have multiple response codes. This is where dynamic blocks come in:

```hcl
# Create method responses dynamically
resource "aws_api_gateway_method_response" "routes" {
  for_each = {
    for item in flatten([
      for route_key, route in var.api_routes : [
        for response in route.responses : {
          key         = "${route_key}-${response.status_code}"
          route_key   = route_key
          status_code = response.status_code
          response_models = response.response_models
          response_parameters = response.response_parameters
        }
      ]
    ]) : item.key => item
  }

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.routes[each.value.route_key].id
  http_method = aws_api_gateway_method.routes[each.value.route_key].http_method
  status_code = each.value.status_code

  response_models     = each.value.response_models
  response_parameters = { for k, v in each.value.response_parameters : k => v }
}
```

## HTTP API (API Gateway v2) with Dynamic Blocks

API Gateway v2 (HTTP APIs) is simpler and often a better choice. Dynamic blocks work here too:

```hcl
variable "http_api_routes" {
  description = "HTTP API route configurations"
  type = map(object({
    route_key     = string  # "GET /users", "POST /orders"
    integration = object({
      type                = string  # "AWS_PROXY"
      uri                 = string  # Lambda function ARN or HTTP URL
      payload_format      = optional(string, "2.0")
      connection_type     = optional(string, "INTERNET")
      timeout_milliseconds = optional(number, 30000)
    })
    authorization = optional(object({
      type        = string  # "JWT", "CUSTOM"
      authorizer_key = string
      scopes      = optional(list(string), [])
    }))
  }))
}

# Create the HTTP API
resource "aws_apigatewayv2_api" "main" {
  name          = "my-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }
}

# Create integrations
resource "aws_apigatewayv2_integration" "routes" {
  for_each = var.http_api_routes

  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = each.value.integration.type
  integration_uri        = each.value.integration.uri
  payload_format_version = each.value.integration.payload_format
  connection_type        = each.value.integration.connection_type
  timeout_milliseconds   = each.value.integration.timeout_milliseconds
}

# Create routes
resource "aws_apigatewayv2_route" "routes" {
  for_each = var.http_api_routes

  api_id    = aws_apigatewayv2_api.main.id
  route_key = each.value.route_key
  target    = "integrations/${aws_apigatewayv2_integration.routes[each.key].id}"

  # Set authorization if configured
  authorization_type = each.value.authorization != null ? each.value.authorization.type : "NONE"
  authorizer_id      = each.value.authorization != null ? aws_apigatewayv2_authorizer.main[each.value.authorization.authorizer_key].id : null
  authorization_scopes = each.value.authorization != null ? each.value.authorization.scopes : null
}
```

## Stage Configuration with Dynamic Blocks

API Gateway stages can have route-specific settings. Dynamic blocks handle the per-route overrides:

```hcl
variable "stage_route_settings" {
  description = "Per-route settings for the API stage"
  type = map(object({
    throttling_burst_limit = optional(number)
    throttling_rate_limit  = optional(number)
    logging_level          = optional(string)
    detailed_metrics       = optional(bool, false)
  }))
  default = {}
}

resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.stage_name
  auto_deploy = true

  # Dynamic access log settings
  dynamic "access_log_settings" {
    for_each = var.access_log_arn != null ? [1] : []
    content {
      destination_arn = var.access_log_arn
    }
  }

  # Dynamic route settings for each configured route
  dynamic "route_settings" {
    for_each = var.stage_route_settings
    content {
      route_key              = route_settings.key
      throttling_burst_limit = route_settings.value.throttling_burst_limit
      throttling_rate_limit  = route_settings.value.throttling_rate_limit
      logging_level          = route_settings.value.logging_level
      detailed_metrics_enabled = route_settings.value.detailed_metrics
    }
  }

  # Stage variables
  stage_variables = var.stage_variables
}
```

## Request Validators and Models

For REST APIs, request validation can also be generated dynamically:

```hcl
variable "request_validators" {
  description = "Request validators for the API"
  type = map(object({
    name                        = string
    validate_request_body       = bool
    validate_request_parameters = bool
  }))
  default = {
    "body-only" = {
      name                        = "Validate body"
      validate_request_body       = true
      validate_request_parameters = false
    }
    "params-only" = {
      name                        = "Validate parameters"
      validate_request_body       = false
      validate_request_parameters = true
    }
    "all" = {
      name                        = "Validate all"
      validate_request_body       = true
      validate_request_parameters = true
    }
  }
}

resource "aws_api_gateway_request_validator" "main" {
  for_each = var.request_validators

  rest_api_id                 = aws_api_gateway_rest_api.main.id
  name                        = each.value.name
  validate_request_body       = each.value.validate_request_body
  validate_request_parameters = each.value.validate_request_parameters
}
```

## Practical Example - Full API Setup

Here is how you might define a simple CRUD API:

```hcl
# terraform.tfvars
http_api_routes = {
  "list-users" = {
    route_key = "GET /users"
    integration = {
      type = "AWS_PROXY"
      uri  = "arn:aws:lambda:us-east-1:123456789:function:list-users"
    }
  }
  "get-user" = {
    route_key = "GET /users/{id}"
    integration = {
      type = "AWS_PROXY"
      uri  = "arn:aws:lambda:us-east-1:123456789:function:get-user"
    }
  }
  "create-user" = {
    route_key = "POST /users"
    integration = {
      type = "AWS_PROXY"
      uri  = "arn:aws:lambda:us-east-1:123456789:function:create-user"
    }
    authorization = {
      type           = "JWT"
      authorizer_key = "cognito"
      scopes         = ["users:write"]
    }
  }
  "delete-user" = {
    route_key = "DELETE /users/{id}"
    integration = {
      type = "AWS_PROXY"
      uri  = "arn:aws:lambda:us-east-1:123456789:function:delete-user"
    }
    authorization = {
      type           = "JWT"
      authorizer_key = "cognito"
      scopes         = ["users:admin"]
    }
  }
}
```

## Summary

API Gateway resources are naturally repetitive, making them a perfect fit for dynamic generation. Use `for_each` on resource blocks to create multiple endpoints, dynamic blocks for optional nested configurations like CORS and authorization, and locals to flatten complex data for response mappings. Whether you are using REST APIs or HTTP APIs, the pattern is the same: define routes as structured data and let Terraform generate the resources. For more API-related patterns, see our guide on [handling complex JSON policies in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-complex-json-policies-in-terraform/view).
