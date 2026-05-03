# How to Manage Datadog Synthetic Tests with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Datadog, Infrastructure as Code, Synthetic Tests, Uptime Monitoring, API Tests

Description: Learn how to create Datadog synthetic API tests and browser tests with assertions and alerting using OpenTofu.

## Introduction

Datadog Synthetic Tests proactively monitor your APIs and browser flows from Datadog-managed test locations worldwide. Managing synthetic tests as code with OpenTofu ensures consistent test coverage across environments and makes test configuration reviewable.

## Prerequisites

- OpenTofu v1.6+
- Datadog API key and Application key with `synthetics_write` permission
- The `DataDog/datadog` OpenTofu provider

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.39"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}
```

## API HTTP Test

```hcl
# synthetic_tests.tf

resource "datadog_synthetics_test" "api_health" {
  name    = "[${var.environment}] API Health Check"
  type    = "api"
  subtype = "http"
  status  = "live"

  request_definition {
    method = "GET"
    url    = "https://api.${var.domain}/health"
  }

  request_headers = {
    "Content-Type"  = "application/json"
    "X-Environment" = var.environment
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "2000"  # 2 seconds max
  }

  assertion {
    type     = "body"
    operator = "contains"
    target   = "\"status\":\"ok\""
  }

  locations = ["aws:us-east-1", "aws:eu-west-1", "aws:ap-southeast-1"]

  options_list {
    tick_every = 60  # Run every 60 seconds

    retry {
      count    = 2
      interval = 300  # 300ms between retries
    }

    monitor_options {
      renotify_interval = 120
    }
  }

  tags = ["env:${var.environment}", "service:api", "managed-by:opentofu"]
}
```

## Multi-Step API Test

```hcl
resource "datadog_synthetics_test" "user_workflow" {
  name    = "[${var.environment}] User Login Workflow"
  type    = "api"
  subtype = "multi"
  status  = "live"

  api_step {
    name = "Step 1: Login"
    subtype = "http"
    request_definition {
      method = "POST"
      url    = "https://api.${var.domain}/auth/login"
      body   = jsonencode({ email = "test@example.com", password = "{{ DD_TEST_PASSWORD }}" })
    }
    assertion {
      type     = "statusCode"
      operator = "is"
      target   = "200"
    }
    extracted_value {
      name = "AUTH_TOKEN"
      type = "http_body"
      parser {
        type  = "json_path"
        value = "$.token"
      }
    }
  }

  api_step {
    name    = "Step 2: Get User Profile"
    subtype = "http"
    request_definition {
      method = "GET"
      url    = "https://api.${var.domain}/users/me"
    }
    request_headers = {
      "Authorization" = "Bearer {{ AUTH_TOKEN }}"
    }
    assertion {
      type     = "statusCode"
      operator = "is"
      target   = "200"
    }
  }

  locations = ["aws:us-east-1", "aws:eu-west-1"]

  options_list {
    tick_every = 300  # Run every 5 minutes
  }

  tags = ["env:${var.environment}", "managed-by:opentofu"]
}
```

## SSL Certificate Test

```hcl
resource "datadog_synthetics_test" "ssl_cert" {
  name    = "[${var.environment}] SSL Certificate Expiry"
  type    = "api"
  subtype = "ssl"
  status  = "live"

  request_definition {
    host = "api.${var.domain}"
    port = "443"
  }

  assertion {
    type     = "certificate"
    operator = "isInMoreThan"
    target   = "30"  # Alert if cert expires in < 30 days
  }

  locations = ["aws:us-east-1"]

  options_list {
    tick_every            = 86400  # Check daily
    accept_self_signed    = false
    check_certificate_revocation = true
  }

  tags = ["env:${var.environment}", "managed-by:opentofu"]
}
```

## Outputs

```hcl
output "api_health_test_id" {
  description = "ID of the API health synthetic test"
  value       = datadog_synthetics_test.api_health.id
}

output "api_health_monitor_id" {
  description = "Monitor ID automatically created for the synthetic test"
  value       = datadog_synthetics_test.api_health.monitor_id
}
```

## Deploy

```bash
export DD_API_KEY="your-datadog-api-key"
export DD_APP_KEY="your-datadog-app-key"

tofu init
tofu apply
```

## Conclusion

Datadog synthetic tests managed with OpenTofu make API coverage reproducible and reviewable. Use `api` + `http` subtype for single endpoint checks, `api` + `multi` for multi-step workflows like login flows, and `api` + `ssl` for certificate expiry monitoring. Each synthetic test automatically creates a Datadog monitor - use `monitor_id` in the output to reference it in SLO definitions. Test from multiple `locations` to detect regional outages.
