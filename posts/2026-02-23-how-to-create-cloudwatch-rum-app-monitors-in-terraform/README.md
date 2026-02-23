# How to Create CloudWatch RUM App Monitors in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, RUM, Monitoring, Frontend, Infrastructure as Code

Description: Learn how to create CloudWatch Real User Monitoring app monitors using Terraform to track real user experience and frontend performance metrics.

---

CloudWatch Real User Monitoring (RUM) captures performance data from actual user sessions in your web applications. Unlike synthetic monitoring that simulates users, RUM shows you exactly how real users experience your site, including page load times, JavaScript errors, and user journeys. This guide shows you how to set up RUM app monitors with Terraform.

## Understanding CloudWatch RUM

CloudWatch RUM works by embedding a lightweight JavaScript snippet in your web pages. This snippet collects performance data, navigation events, and errors from real user browsers and sends them to CloudWatch. You can then analyze this data to understand user experience patterns, identify performance bottlenecks, and track errors.

## Setting Up the Foundation

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating a Basic RUM App Monitor

```hcl
# Create a CloudWatch RUM app monitor
resource "aws_rum_app_monitor" "main" {
  name   = "my-web-app"
  domain = var.app_domain

  # Configure what data to collect
  app_monitor_configuration {
    # Sample 100% of sessions (adjust for high-traffic sites)
    session_sample_rate = 1.0

    # Enable telemetry types
    telemetries = ["errors", "performance", "http"]

    # Allow cookies for session tracking
    allow_cookies = true

    # Enable X-Ray tracing for backend correlation
    enable_xray = true

    # Set the identity pool for unauthenticated access
    identity_pool_id = aws_cognito_identity_pool.rum.id
    guest_role_arn   = aws_iam_role.rum_guest.arn
  }

  # Enable custom events
  custom_events {
    status = "ENABLED"
  }

  tags = {
    Environment = var.environment
    Application = "web-app"
  }
}

variable "app_domain" {
  type        = string
  description = "Domain name of the web application"
  default     = "example.com"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Setting Up Cognito for RUM Authentication

RUM requires a Cognito Identity Pool for browser authentication:

```hcl
# Create a Cognito Identity Pool for RUM
resource "aws_cognito_identity_pool" "rum" {
  identity_pool_name               = "rum-identity-pool"
  allow_unauthenticated_identities = true

  # Allow classic flow for RUM
  allow_classic_flow = true
}

# IAM role for unauthenticated RUM users
resource "aws_iam_role" "rum_guest" {
  name = "rum-guest-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "cognito-identity.amazonaws.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.rum.id
        }
        "ForAnyValue:StringLike" = {
          "cognito-identity.amazonaws.com:amr" = "unauthenticated"
        }
      }
    }]
  })
}

# Policy allowing RUM data submission
resource "aws_iam_role_policy" "rum_guest" {
  name = "rum-guest-policy"
  role = aws_iam_role.rum_guest.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "rum:PutRumEvents"
      ]
      Resource = aws_rum_app_monitor.main.arn
    }]
  })
}

# Attach the role to the identity pool
resource "aws_cognito_identity_pool_roles_attachment" "rum" {
  identity_pool_id = aws_cognito_identity_pool.rum.id

  roles = {
    "unauthenticated" = aws_iam_role.rum_guest.arn
  }
}
```

## Configuring Sampling Rates

For high-traffic applications, you may want to reduce the sampling rate:

```hcl
# High-traffic production app with reduced sampling
resource "aws_rum_app_monitor" "production" {
  name   = "production-app"
  domain = "app.example.com"

  app_monitor_configuration {
    # Sample only 10% of sessions for high-traffic apps
    session_sample_rate = 0.1

    telemetries = ["errors", "performance", "http"]
    allow_cookies = true
    enable_xray = true

    identity_pool_id = aws_cognito_identity_pool.rum.id
    guest_role_arn   = aws_iam_role.rum_guest.arn

    # Exclude specific URLs from monitoring
    excluded_pages = [
      "/admin/*",
      "/internal/*"
    ]

    # Only monitor specific pages
    favorite_pages = [
      "/",
      "/checkout",
      "/product/*",
      "/search"
    ]
  }
}

# Staging app with full sampling for debugging
resource "aws_rum_app_monitor" "staging" {
  name   = "staging-app"
  domain = "staging.example.com"

  app_monitor_configuration {
    # Full sampling in staging
    session_sample_rate = 1.0

    telemetries = ["errors", "performance", "http"]
    allow_cookies = true
    enable_xray = true

    identity_pool_id = aws_cognito_identity_pool.rum.id
    guest_role_arn   = aws_iam_role.rum_guest.arn
  }
}
```

## Creating Alarms Based on RUM Metrics

```hcl
# Alarm for JavaScript errors detected by RUM
resource "aws_cloudwatch_metric_alarm" "rum_js_errors" {
  alarm_name          = "rum-js-errors-${aws_rum_app_monitor.main.name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "JsErrorCount"
  namespace           = "AWS/RUM"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "High JavaScript error count detected by RUM"
  alarm_actions       = [aws_sns_topic.rum_alerts.arn]

  dimensions = {
    application_name = aws_rum_app_monitor.main.name
  }
}

# Alarm for slow page loads
resource "aws_cloudwatch_metric_alarm" "rum_page_load" {
  alarm_name          = "rum-slow-page-load-${aws_rum_app_monitor.main.name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "NavigationFrustratedTransaction"
  namespace           = "AWS/RUM"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "Too many frustrated user sessions detected"
  alarm_actions       = [aws_sns_topic.rum_alerts.arn]

  dimensions = {
    application_name = aws_rum_app_monitor.main.name
  }
}

# Alarm for HTTP errors from browser requests
resource "aws_cloudwatch_metric_alarm" "rum_http_errors" {
  alarm_name          = "rum-http-errors-${aws_rum_app_monitor.main.name}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HttpErrorCount"
  namespace           = "AWS/RUM"
  period              = 300
  statistic           = "Sum"
  threshold           = 25
  alarm_description   = "High HTTP error count detected from real user sessions"
  alarm_actions       = [aws_sns_topic.rum_alerts.arn]

  dimensions = {
    application_name = aws_rum_app_monitor.main.name
  }
}

resource "aws_sns_topic" "rum_alerts" {
  name = "rum-alert-notifications"
}
```

## Output the JavaScript Snippet

```hcl
# Output the RUM configuration needed for the frontend
output "rum_app_monitor_id" {
  value       = aws_rum_app_monitor.main.app_monitor_id
  description = "App Monitor ID to use in the RUM JavaScript snippet"
}

output "rum_identity_pool_id" {
  value       = aws_cognito_identity_pool.rum.id
  description = "Cognito Identity Pool ID for the RUM snippet"
}

output "rum_snippet_config" {
  value = {
    app_monitor_id   = aws_rum_app_monitor.main.app_monitor_id
    identity_pool_id = aws_cognito_identity_pool.rum.id
    region           = data.aws_region.current.name
    guest_role_arn   = aws_iam_role.rum_guest.arn
  }
  description = "Configuration values needed for the RUM JavaScript snippet"
}

data "aws_region" "current" {}
```

## Multiple App Monitor Management

```hcl
# Manage RUM for multiple applications
variable "applications" {
  type = map(object({
    domain      = string
    sample_rate = number
    telemetries = list(string)
  }))
  default = {
    "main-website" = {
      domain      = "www.example.com"
      sample_rate = 0.5
      telemetries = ["errors", "performance", "http"]
    }
    "docs-site" = {
      domain      = "docs.example.com"
      sample_rate = 0.2
      telemetries = ["errors", "performance"]
    }
    "admin-portal" = {
      domain      = "admin.example.com"
      sample_rate = 1.0
      telemetries = ["errors", "performance", "http"]
    }
  }
}

resource "aws_rum_app_monitor" "apps" {
  for_each = var.applications

  name   = each.key
  domain = each.value.domain

  app_monitor_configuration {
    session_sample_rate = each.value.sample_rate
    telemetries         = each.value.telemetries
    allow_cookies       = true
    enable_xray         = true
    identity_pool_id    = aws_cognito_identity_pool.rum.id
    guest_role_arn      = aws_iam_role.rum_guest.arn
  }
}
```

## Best Practices

Start with a high sampling rate and reduce it as traffic increases. This way you get detailed data during early adoption and optimize costs at scale. Enable X-Ray integration to correlate frontend performance with backend traces. Use favorite_pages to focus monitoring on critical user paths like checkout flows and login pages. Create separate app monitors for different environments so staging data does not pollute production metrics. Set up alarms on frustrated session counts rather than absolute load times since the frustration metric accounts for user expectations.

For server-side monitoring to complement RUM, see our guides on [CloudWatch Synthetics canaries](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-synthetics-canaries-in-terraform/view) and [CloudWatch alarms for ALB](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-alarms-for-alb-in-terraform/view).

## Conclusion

CloudWatch RUM managed through Terraform gives you visibility into the actual user experience of your web applications. By combining RUM with synthetic monitoring and server-side metrics, you get a complete picture of application performance from the user's perspective through to the backend. The Terraform configuration ensures that your RUM setup is reproducible, version-controlled, and consistently applied across all your web properties.
