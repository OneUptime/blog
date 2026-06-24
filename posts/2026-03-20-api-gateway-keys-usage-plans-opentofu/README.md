# How to Configure API Gateway Keys and Usage Plans with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Usage Plans, API Key, Infrastructure as Code

Description: Learn how to create API keys and usage plans for AWS API Gateway using OpenTofu to control access and apply rate limiting.

---

API Gateway usage plans let you define throttling limits and quota settings for groups of clients. API keys identify clients and associate them with a usage plan, enabling per-client throttling and letting you require a valid key on selected methods.

---

## Create a REST API and Stage

```hcl
resource "aws_api_gateway_rest_api" "api" {
  name        = "my-api"
  description = "My REST API"
}

resource "aws_api_gateway_resource" "items" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "items"
}

resource "aws_api_gateway_deployment" "api" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  depends_on  = [aws_api_gateway_method.get_items]
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "prod"
}
```

---

## Create a Usage Plan

```hcl
resource "aws_api_gateway_usage_plan" "standard" {
  name        = "standard-plan"
  description = "Standard tier usage plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.api.id
    stage  = aws_api_gateway_stage.prod.stage_name
  }

  throttle_settings {
    rate_limit  = 100  # requests per second
    burst_limit = 200  # maximum request burst over a short time window
  }

  quota_settings {
    limit  = 10000  # requests per period
    period = "MONTH"
  }
}
```

---

## Create API Keys

```hcl
resource "aws_api_gateway_api_key" "client_a" {
  name    = "client-a-key"
  enabled = true
}

resource "aws_api_gateway_api_key" "client_b" {
  name    = "client-b-key"
  enabled = true
}
```

---

## Associate API Keys with the Usage Plan

```hcl
resource "aws_api_gateway_usage_plan_key" "client_a" {
  key_id        = aws_api_gateway_api_key.client_a.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.standard.id
}

resource "aws_api_gateway_usage_plan_key" "client_b" {
  key_id        = aws_api_gateway_api_key.client_b.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.standard.id
}
```

---

## Enable API Key Requirement on a Method

```hcl
resource "aws_api_gateway_method" "get_items" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.items.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = true  # Enforce API key
}
```

---

## Output the API Keys

```hcl
output "client_a_key" {
  value     = aws_api_gateway_api_key.client_a.value
  sensitive = true
}
```

```bash
tofu apply
tofu output -raw client_a_key
```

---

## Summary

Create `aws_api_gateway_usage_plan` with throttle and quota settings, then create `aws_api_gateway_api_key` resources for each client. Link them with `aws_api_gateway_usage_plan_key`. Set `api_key_required = true` on methods that should require a valid key. This pattern gives you fine-grained per-client throttling through infrastructure code.
