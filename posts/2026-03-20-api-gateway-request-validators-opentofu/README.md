# How to Configure API Gateway Request Validators with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Request Validation, Infrastructure as Code, DevOps

Description: Learn how to define and attach request validators to AWS API Gateway methods using OpenTofu to enforce parameter and body validation.

---

API Gateway request validators allow AWS to reject requests that are missing required parameters or have invalid request bodies before they reach your backend. You can validate required query string parameters, headers, and request body content without writing any validation code in your Lambda functions or services.

---

## Create a Request Validator

```hcl
resource "aws_api_gateway_request_validator" "body_and_params" {
  name                        = "validate-body-and-params"
  rest_api_id                 = aws_api_gateway_rest_api.api.id
  validate_request_body       = true
  validate_request_parameters = true
}

resource "aws_api_gateway_request_validator" "params_only" {
  name                        = "validate-params-only"
  rest_api_id                 = aws_api_gateway_rest_api.api.id
  validate_request_body       = false
  validate_request_parameters = true
}
```

---

## Attach a Validator to a Method

```hcl
resource "aws_api_gateway_method" "post_order" {
  rest_api_id          = aws_api_gateway_rest_api.api.id
  resource_id          = aws_api_gateway_resource.orders.id
  http_method          = "POST"
  authorization        = "NONE"
  request_validator_id = aws_api_gateway_request_validator.body_and_params.id

  request_parameters = {
    "method.request.querystring.version" = true  # required query param
    "method.request.header.X-Api-Key"    = false  # optional header
  }
}
```

---

## Define a Model for Body Validation

```hcl
resource "aws_api_gateway_model" "order_model" {
  rest_api_id  = aws_api_gateway_rest_api.api.id
  name         = "OrderRequest"
  content_type = "application/json"

  schema = jsonencode({
    "$schema" = "http://json-schema.org/draft-04/schema#"
    title     = "OrderRequest"
    type      = "object"
    required  = ["item_id", "quantity"]
    properties = {
      item_id = {
        type = "string"
      }
      quantity = {
        type    = "integer"
        minimum = 1
      }
      notes = {
        type = "string"
      }
    }
  })
}
```

---

## Link the Model to the Method

Update the same method resource to include the request model:

```hcl
resource "aws_api_gateway_method" "post_order" {
  rest_api_id          = aws_api_gateway_rest_api.api.id
  resource_id          = aws_api_gateway_resource.orders.id
  http_method          = "POST"
  authorization        = "NONE"
  request_validator_id = aws_api_gateway_request_validator.body_and_params.id

  request_parameters = {
    "method.request.querystring.version" = true  # required query param
    "method.request.header.X-Api-Key"    = false  # optional header
  }

  request_models = {
    "application/json" = aws_api_gateway_model.order_model.name
  }
}
```

---

## Test Validation Behavior

```bash
# Valid request - passes validation

curl -X POST https://api.example.com/prod/orders?version=1 \
  -H "Content-Type: application/json" \
  -d '{"item_id": "ABC123", "quantity": 2}'

# Missing required field - rejected by API Gateway (400)
curl -X POST https://api.example.com/prod/orders?version=1 \
  -H "Content-Type: application/json" \
  -d '{"item_id": "ABC123"}'
# Response: {"message": "Invalid request body"}
```

---

## Summary

Create `aws_api_gateway_request_validator` resources with `validate_request_body` and `validate_request_parameters` flags, then reference them in `aws_api_gateway_method` via `request_validator_id`. Attach JSON Schema models to enforce body structure. This offloads input validation to the API Gateway layer, reducing noise in your backend logs.
