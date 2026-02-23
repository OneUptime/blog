# How to Use the urlencode Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, urlencode, URL Encoding, API Integration, Infrastructure as Code

Description: Learn how to use Terraform's urlencode function to safely encode strings for URLs, query parameters, API calls, and webhook configurations in your infrastructure code.

---

The `urlencode` function in Terraform applies URL encoding (also called percent encoding) to a string, making it safe for use in URLs. Characters that have special meaning in URLs - like spaces, ampersands, equals signs, and slashes - get replaced with their percent-encoded equivalents. This is essential when building URLs that include user-provided values, query parameters, or path segments that might contain special characters.

## Function Syntax

```hcl
# urlencode(string)
urlencode("hello world")
# Result: "hello+world"

urlencode("key=value&foo=bar")
# Result: "key%3Dvalue%26foo%3Dbar"
```

The function follows the standard application/x-www-form-urlencoded encoding, where spaces become `+` and special characters become percent-encoded sequences.

## Common Characters and Their Encodings

```hcl
locals {
  # See what common characters encode to
  space       = urlencode(" ")       # "+"
  ampersand   = urlencode("&")       # "%26"
  equals      = urlencode("=")       # "%3D"
  question    = urlencode("?")       # "%3F"
  slash       = urlencode("/")       # "%2F"
  hash        = urlencode("#")       # "%23"
  at          = urlencode("@")       # "%40"
  colon       = urlencode(":")       # "%3A"
  plus        = urlencode("+")       # "%2B"
  percent     = urlencode("%")       # "%25"
}
```

## Building URLs with Query Parameters

The most frequent use case is constructing URLs with query parameters that contain special characters:

```hcl
variable "search_term" {
  type    = string
  default = "error code 500 & timeout"
}

variable "filter" {
  type    = string
  default = "status=active"
}

locals {
  # Without encoding, these would break the URL
  search_url = "https://api.example.com/search?q=${urlencode(var.search_term)}&filter=${urlencode(var.filter)}"
  # Result: "https://api.example.com/search?q=error+code+500+%26+timeout&filter=status%3Dactive"
}

output "search_url" {
  value = local.search_url
}
```

## Webhook URL Configuration

Webhooks often include tokens or parameters in the URL:

```hcl
variable "webhook_token" {
  type      = string
  sensitive = true
}

variable "channel_name" {
  type    = string
  default = "#alerts & notifications"
}

locals {
  # Encode the channel name for use in a webhook URL
  slack_webhook = "https://hooks.slack.com/services/${var.webhook_token}?channel=${urlencode(var.channel_name)}"
}

# Use in a monitoring alert
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## API Gateway Query String Parameters

When configuring API Gateway with default query parameters:

```hcl
locals {
  # Build a redirect URL with query parameters
  redirect_base = "https://app.example.com/callback"
  redirect_params = {
    state     = var.oauth_state
    client_id = var.client_id
    scope     = "openid profile email"
    prompt    = "consent"
  }

  # Encode each parameter and join them
  query_string = join("&", [
    for key, value in local.redirect_params :
    "${urlencode(key)}=${urlencode(value)}"
  ])

  redirect_url = "${local.redirect_base}?${local.query_string}"
}

output "redirect_url" {
  value = local.redirect_url
  # Result: "https://app.example.com/callback?client_id=...&prompt=consent&scope=openid+profile+email&state=..."
}
```

## Encoding Values for Terraform Backend Configuration

Some backend configurations need URL-encoded values:

```hcl
locals {
  # If your S3 key path contains special characters
  state_key = "terraform/environments/${var.environment}/${var.project}/state"

  # URL-encode for use in URLs referencing the state
  state_url = "https://s3.amazonaws.com/${var.state_bucket}/${urlencode(local.state_key)}"
}
```

## Building Grafana Dashboard URLs

Grafana and similar tools accept filter parameters in URLs:

```hcl
locals {
  grafana_base = "https://grafana.example.com/d/abc123/dashboard"

  grafana_params = {
    "var-environment" = var.environment
    "var-service"     = var.service_name
    "var-instance"    = "ip-10-0-1-42.ec2.internal"
    from              = "now-24h"
    to                = "now"
  }

  grafana_query = join("&", [
    for key, value in local.grafana_params :
    "${key}=${urlencode(value)}"
  ])

  grafana_url = "${local.grafana_base}?${local.grafana_query}"
}

output "grafana_dashboard" {
  value = local.grafana_url
}
```

## Encoding for CloudWatch Log Insights

CloudWatch Log Insights queries in URLs need encoding:

```hcl
locals {
  log_query = <<-EOF
    fields @timestamp, @message
    | filter @message like /ERROR/
    | sort @timestamp desc
    | limit 100
  EOF

  # Build a CloudWatch console URL with the query
  cw_base = "https://console.aws.amazon.com/cloudwatch/home"
  cw_url  = "${local.cw_base}?region=${var.region}#logsV2:logs-insights$3FqueryDetail$3D~(query~'${urlencode(trimspace(local.log_query))}')"
}
```

## Encoding Database Connection Strings

Database passwords can contain characters that break connection string URLs:

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

locals {
  # The password might contain @, :, /, or other URL-special characters
  db_connection = format(
    "postgresql://%s:%s@%s:%d/%s?sslmode=require",
    urlencode(var.db_username),
    urlencode(var.db_password),
    var.db_host,
    var.db_port,
    var.db_name
  )
}

# Pass the connection string to an application
resource "kubernetes_secret" "db" {
  metadata {
    name      = "db-credentials"
    namespace = var.namespace
  }

  data = {
    connection_string = local.db_connection
  }
}
```

## Encoding for Terraform HTTP Provider

When making HTTP requests with the HTTP provider:

```hcl
variable "api_filter" {
  type    = string
  default = "status = active AND region = us-east-1"
}

data "http" "resources" {
  url = "https://api.example.com/resources?filter=${urlencode(var.api_filter)}&limit=100"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.api_token}"
  }
}
```

## Building OAuth Authorization URLs

OAuth flows require carefully encoded redirect URIs and scopes:

```hcl
locals {
  auth_params = {
    client_id     = var.oauth_client_id
    response_type = "code"
    redirect_uri  = "https://${var.app_domain}/auth/callback"
    scope         = "openid profile email offline_access"
    state         = var.oauth_state
    audience      = "https://api.example.com"
  }

  auth_query = join("&", [
    for key, value in local.auth_params :
    "${key}=${urlencode(value)}"
  ])

  authorization_url = "https://${var.auth_domain}/authorize?${local.auth_query}"
}

output "authorization_url" {
  value = local.authorization_url
}
```

## Encoding for SNS Subscription Filters

```hcl
locals {
  # Build an HTTPS endpoint with authentication parameters
  endpoint_url = format(
    "https://webhook.example.com/sns?token=%s&source=%s",
    urlencode(var.webhook_token),
    urlencode("aws-sns-${var.environment}")
  )
}

resource "aws_sns_topic_subscription" "webhook" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = local.endpoint_url
}
```

## Encoding for Tags That Become URL Parameters

Some systems use tags as URL parameters in dashboards or search:

```hcl
locals {
  # Tags that will be used in URL-based searches
  search_tags = {
    project     = var.project_name
    environment = var.environment
    cost_center = "Engineering/Platform Team"
    owner       = "ops+alerts@example.com"
  }

  # Create URL-safe tag values
  encoded_tags = {
    for key, value in local.search_tags :
    key => urlencode(value)
  }
}
```

## Limitations

There are a few things to know about `urlencode`:

1. It encodes for the `application/x-www-form-urlencoded` content type, which means spaces become `+` rather than `%20`. Most systems handle both, but if you specifically need `%20`, use `replace(urlencode(value), "+", "%20")`.

2. There is no built-in `urldecode` function in Terraform. If you need to decode URL-encoded strings, you will need to use `replace` for common sequences or an external data source.

3. Encoding is not idempotent. Encoding an already-encoded string will double-encode it. Make sure you only encode once.

4. The function works on the entire string. If you want to encode only certain parts of a URL (like query values but not the structure), encode each part separately and assemble the URL manually.

## Summary

The `urlencode` function makes strings safe for inclusion in URLs by replacing special characters with percent-encoded equivalents. Use it for query parameter values, webhook URLs, database connection strings, and any context where user-provided or dynamic values become part of a URL. The key rule is to encode the values, not the URL structure - encode each parameter value separately, then assemble the complete URL with the proper delimiters.
