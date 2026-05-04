# How to Create Datadog Synthetic Tests with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Datadog, Synthetic Tests, Monitoring, Infrastructure as Code

Description: Learn how to create Datadog synthetic monitoring tests with OpenTofu to continuously verify application availability and performance.

Datadog Synthetic Tests run API checks and browser tests against your application from global test locations. Managing them in OpenTofu ensures your synthetic monitoring coverage is consistent across environments and reviewed alongside infrastructure changes.

## Provider Configuration

```hcl
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}
```

## Creating an API Test

```hcl
resource "datadog_synthetics_test" "api_health" {
  name    = "API Health Check"
  type    = "api"
  subtype = "http"
  status  = "live"

  locations = ["aws:us-east-1", "aws:eu-west-1", "aws:ap-southeast-1"]

  request_definition {
    method = "GET"
    url    = "https://api.example.com/health"
    timeout = 30
  }

  request_headers = {
    "Accept" = "application/json"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  assertion {
    type     = "responseTime"
    operator = "lessThan"
    target   = "2000"  # 2 seconds
  }

  assertion {
    type     = "body"
    operator = "contains"
    target   = "\"status\":\"ok\""
  }

  options_list {
    tick_every          = 60   # Run every 60 seconds
    min_failure_duration = 0
    min_location_failed  = 1

    retry {
      count    = 1
      interval = 300
    }

    monitor_options {
      renotify_interval = 120
    }
  }
}
```

## Creating an SSL Certificate Test

```hcl
resource "datadog_synthetics_test" "ssl_check" {
  name    = "SSL Certificate Check"
  type    = "api"
  subtype = "ssl"
  status  = "live"

  locations = ["aws:us-east-1"]

  request_definition {
    host = "example.com"
    port = "443"
  }

  assertion {
    type     = "certificate"
    operator = "isInMoreThan"
    target   = "10"  # Fail if cert expires in fewer than 10 days
  }

  options_list {
    tick_every = 86400  # Check daily
  }
}
```

## Creating a Multistep API Test

```hcl
resource "datadog_synthetics_test" "user_flow" {
  name    = "User Authentication Flow"
  type    = "api"
  subtype = "multi"
  status  = "live"

  locations = ["aws:us-east-1"]

  api_step {
    name = "Login"
    request_definition {
      method = "POST"
      url    = "https://api.example.com/auth/login"
      body   = jsonencode({ email = "test@example.com", password = "testpass" })
    }
    assertion {
      type     = "statusCode"
      operator = "is"
      target   = "200"
    }
    extracted_value {
      name  = "auth_token"
      type  = "http_body"
      field = "token"
      parser {
        type  = "json_path"
        value = "$.token"
      }
    }
  }

  api_step {
    name = "Get Profile"
    request_definition {
      method = "GET"
      url    = "https://api.example.com/users/me"
    }
    request_headers = {
      "Authorization" = "Bearer {{ auth_token }}"
    }
    assertion {
      type     = "statusCode"
      operator = "is"
      target   = "200"
    }
  }

  options_list {
    tick_every = 300  # Every 5 minutes
  }
}
```

## Alerting on Test Failures

Synthetic tests automatically create an associated alert monitor. Notifications are configured by setting the `message` field on the synthetic test itself, using the same `@username` notation as Datadog events:

```hcl
resource "datadog_synthetics_test" "api_health_with_alerts" {
  name    = "API Health Check"
  type    = "api"
  subtype = "http"
  status  = "live"
  message = "Synthetic test failed. @pagerduty-oncall @slack-platform-alerts"
  tags    = ["env:prod", "team:platform"]

  locations = ["aws:us-east-1"]

  request_definition {
    method = "GET"
    url    = "https://api.example.com/health"
  }

  assertion {
    type     = "statusCode"
    operator = "is"
    target   = "200"
  }

  options_list {
    tick_every = 60
  }
}
```

## Conclusion

Datadog Synthetic Tests in OpenTofu enable continuous, global availability monitoring. Define API tests for health checks, SSL tests for certificate expiry, and multistep tests for user flow verification. All tests run from multiple global locations and alert when assertions fail, giving you early warning before real users are affected.
