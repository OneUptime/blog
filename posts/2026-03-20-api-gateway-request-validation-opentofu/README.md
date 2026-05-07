# How to Configure API Gateway Request Validation with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Request Validation, JSON Schema, Input Validation, Infrastructure as Code

Description: Learn how to configure API Gateway request validators with OpenTofu to validate request bodies against JSON schemas and required parameters before they reach your backend.

## Introduction

API Gateway request validation rejects malformed requests before they reach your Lambda function or backend, reducing unnecessary invocations and providing immediate feedback to API consumers. Validators can check request bodies against JSON Schema models, required headers, and required query string parameters.

## Prerequisites

- OpenTofu v1.6+
- An existing API Gateway REST API
- AWS credentials with API Gateway permissions

## Step 1: Create Request Validator

```hcl
# Validator for body + parameters

resource "aws_api_gateway_request_validator" "full" {
  name                        = "full-validation"
  rest_api_id                 = var.api_gateway_id
  validate_request_body       = true   # Validate body against model schema
  validate_request_parameters = true   # Validate required headers/query params
}

# Validator for parameters only
resource "aws_api_gateway_request_validator" "params_only" {
  name                        = "params-only-validation"
  rest_api_id                 = var.api_gateway_id
  validate_request_body       = false
  validate_request_parameters = true
}
```

## Step 2: Define Request Body Model (JSON Schema)

API Gateway validates the request body only when the request `Content-Type` matches a configured request model. If you want the same schema to apply regardless of content type, use `$default` instead of `application/json`.

```hcl
# JSON Schema model for the request body
resource "aws_api_gateway_model" "create_user" {
  rest_api_id  = var.api_gateway_id
  name         = "CreateUserRequest"
  content_type = "application/json"

  schema = jsonencode({
    "$schema" = "http://json-schema.org/draft-04/schema#"
    type      = "object"
    required  = ["name", "email", "role"]
    properties = {
      name = {
        type      = "string"
        minLength = 1
        maxLength = 100
      }
      email = {
        type    = "string"
        pattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      }
      role = {
        type = "string"
        enum = ["admin", "user", "viewer"]
      }
      age = {
        type    = "integer"
        minimum = 18
        maximum = 120
      }
    }
    additionalProperties = false
  })
}
```

## Step 3: Apply Validator to a Method

```hcl
resource "aws_api_gateway_method" "create_user" {
  rest_api_id   = var.api_gateway_id
  resource_id   = var.users_resource_id
  http_method   = "POST"
  authorization = "NONE"

  # Apply the full validator
  request_validator_id = aws_api_gateway_request_validator.full.id

  # Required request parameters
  request_parameters = {
    "method.request.header.Content-Type" = true  # Required header
    "method.request.querystring.version" = false  # Optional query param
  }

  # Associate the model with the request body
  request_models = {
    "application/json" = aws_api_gateway_model.create_user.name
  }
}
```

## Step 4: Configure Error Response for Validation Failures

```hcl
# Customize the 400 error response for validation failures
resource "aws_api_gateway_gateway_response" "bad_request" {
  rest_api_id   = var.api_gateway_id
  response_type = "BAD_REQUEST_BODY"
  status_code   = "400"

  response_templates = {
    "application/json" = jsonencode({
      error   = "Bad Request"
      message = "$context.error.validationErrorString"
      requestId = "$context.requestId"
    })
  }

  response_parameters = {
    "gatewayresponse.header.Content-Type" = "'application/json'"
  }
}

resource "aws_api_gateway_gateway_response" "missing_auth" {
  rest_api_id   = var.api_gateway_id
  response_type = "BAD_REQUEST_PARAMETERS"
  status_code   = "400"

  response_templates = {
    "application/json" = jsonencode({
      error   = "Missing Required Parameters"
      message = "$context.error.validationErrorString"
    })
  }
}
```

## Step 5: Deploy

For REST APIs, updates to methods, models, request validators, and gateway responses do not take effect until you deploy the API to a stage.

```hcl
resource "aws_api_gateway_deployment" "request_validation" {
  rest_api_id = var.api_gateway_id

  triggers = {
    redeployment = sha1(jsonencode({
      validators = {
        full = {
          validate_request_body       = aws_api_gateway_request_validator.full.validate_request_body
          validate_request_parameters = aws_api_gateway_request_validator.full.validate_request_parameters
        }
        params_only = {
          validate_request_body       = aws_api_gateway_request_validator.params_only.validate_request_body
          validate_request_parameters = aws_api_gateway_request_validator.params_only.validate_request_parameters
        }
      }
      model_schema = aws_api_gateway_model.create_user.schema
      method = {
        request_models       = aws_api_gateway_method.create_user.request_models
        request_parameters   = aws_api_gateway_method.create_user.request_parameters
        request_validator_id = aws_api_gateway_method.create_user.request_validator_id
      }
      gateway_responses = {
        bad_request = {
          response_templates  = aws_api_gateway_gateway_response.bad_request.response_templates
          response_parameters = aws_api_gateway_gateway_response.bad_request.response_parameters
        }
        bad_request_parameters = {
          response_templates  = aws_api_gateway_gateway_response.missing_auth.response_templates
          response_parameters = aws_api_gateway_gateway_response.missing_auth.response_parameters
        }
      }
    }))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = var.api_gateway_id
  deployment_id = aws_api_gateway_deployment.request_validation.id
  stage_name    = "prod"
}
```

If your deployment and stage are managed outside this module, redeploy the existing stage after `tofu apply`.

```bash
tofu init
tofu plan
tofu apply

# Test validation - missing required field
curl -X POST https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John"}' # Missing email and role - should return 400

# Test valid request
curl -X POST https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com", "role": "user"}'
```

## Conclusion

API Gateway request validation shifts input validation to the API layer, preventing invalid requests from consuming Lambda compute and providing fast, standardized error responses to clients. Use JSON Schema models to enforce data types, required fields, string patterns, and enumeration values. Customize gateway responses to return descriptive error messages including the specific validation failure from `$context.error.validationErrorString`.
