# How to Configure API Gateway Throttling with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Throttling, Rate Limiting, Usage Plans, Infrastructure as Code

Description: Learn how to configure API Gateway throttling with OpenTofu to protect backends from traffic spikes and enforce rate limits per client using usage plans and API keys.

## Introduction

API Gateway throttling protects backend services from being overwhelmed by limiting request rates. API Gateway applies account-level throttling per Region and lets you configure stage-level and per-method throttling targets. Usage Plans with API Keys add per-client throttling and quotas on a best-effort basis. Account-level defaults are typically 10,000 RPS, but some Regions default to 2,500 RPS, and the burst quota is determined by API Gateway. When throttled, API Gateway returns HTTP 429 Too Many Requests.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with API Gateway permissions

## Step 1: Stage-Level Throttling

```hcl
resource "aws_api_gateway_stage" "prod" {
  deployment_id = var.deployment_id
  rest_api_id   = var.rest_api_id
  stage_name    = "prod"
}

resource "aws_api_gateway_method_settings" "throttle" {
  rest_api_id = var.rest_api_id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"  # Apply to all methods

  settings {
    throttling_rate_limit  = 1000   # Steady-state RPS
    throttling_burst_limit = 500    # Burst capacity
  }
}

# Per-method throttling (more restrictive than stage level)

resource "aws_api_gateway_method_settings" "expensive_endpoint" {
  rest_api_id = var.rest_api_id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "reports/GET"  # resource_path/HTTP_METHOD

  settings {
    throttling_rate_limit  = 10   # 10 RPS for expensive report endpoint
    throttling_burst_limit = 5
  }
}
```

## Step 2: Usage Plans with API Keys

Usage plan throttling and quotas apply per API key on methods where `api_key_required = true`.

```hcl
resource "aws_api_gateway_usage_plan" "standard" {
  name        = "${var.project_name}-standard-plan"
  description = "Standard API usage plan"

  api_stages {
    api_id = var.rest_api_id
    stage  = aws_api_gateway_stage.prod.stage_name
  }

  throttle_settings {
    rate_limit  = 100   # 100 RPS target per key
    burst_limit = 50
  }

  quota_settings {
    limit  = 10000  # 10K requests per day target
    period = "DAY"
  }
}

resource "aws_api_gateway_api_key" "client" {
  name    = "${var.project_name}-client-key"
  enabled = true
}

resource "aws_api_gateway_usage_plan_key" "client" {
  key_id        = aws_api_gateway_api_key.client.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.standard.id
}

output "api_key_value" {
  value     = aws_api_gateway_api_key.client.value
  sensitive = true
}
```

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply

# Test throttling behavior by sending concurrent requests
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-API-Key: <api-key>" \
    https://<api-id>.execute-api.<region>.amazonaws.com/prod/reports &
done
wait

# Check usage against the plan quota
aws apigateway get-usage \
  --usage-plan-id <plan-id> \
  --start-date 2026-03-01 \
  --end-date 2026-03-31
```

## Conclusion

Stage-level throttling uses a token bucket algorithm where `rate_limit` is the refill rate and `burst_limit` is the bucket size; clients can burst above the steady-state rate until tokens are exhausted. Usage Plans apply per-client throttling and quota targets to methods with `api_key_required = true`; like other API Gateway throttling controls, these targets are applied on a best-effort basis. Monitor `4XXError` (especially `429` responses) and `5XXError` CloudWatch metrics to detect when clients are being throttled more than expected and adjust limits accordingly.
