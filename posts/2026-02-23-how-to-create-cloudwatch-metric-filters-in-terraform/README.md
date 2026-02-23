# How to Create CloudWatch Metric Filters in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CloudWatch, Monitoring, Logging, Infrastructure as Code

Description: Learn how to create CloudWatch metric filters using Terraform to extract custom metrics from log data and build alarms based on application events.

---

CloudWatch metric filters allow you to turn log data into actionable metrics. By defining patterns that match specific log entries, you can count errors, measure latency, track business events, and create alarms based on your application's behavior. This guide shows you how to create and use CloudWatch metric filters with Terraform.

## Understanding Metric Filters

A metric filter watches a CloudWatch log group for specific patterns and increments a custom metric whenever a match is found. This transforms unstructured log data into structured, alertable metrics. You can then build CloudWatch alarms on these custom metrics just like you would on any AWS-native metric.

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

# Reference an existing log group or create one
resource "aws_cloudwatch_log_group" "application" {
  name              = "/app/production"
  retention_in_days = 30
}

# SNS topic for alerts
resource "aws_sns_topic" "app_alerts" {
  name = "application-alerts"
}
```

## Simple Pattern Matching

Create a metric filter that counts error messages:

```hcl
# Count ERROR level log entries
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "error-count"
  pattern        = "ERROR"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "ApplicationErrors"
    namespace = "Custom/Application"
    value     = "1"
    # Reset to 0 when no errors are found
    default_value = "0"
  }
}

# Create an alarm on the custom metric
resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "application-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApplicationErrors"
  namespace           = "Custom/Application"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Application is generating more than 10 errors per 5 minutes"
  alarm_actions       = [aws_sns_topic.app_alerts.arn]
  ok_actions          = [aws_sns_topic.app_alerts.arn]
  treat_missing_data  = "notBreaching"
}
```

## JSON Pattern Matching

For structured JSON logs, use JSON-specific filter patterns:

```hcl
# Match JSON log entries with specific fields
resource "aws_cloudwatch_log_metric_filter" "http_500" {
  name           = "http-500-errors"
  pattern        = "{ $.statusCode = 500 }"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "HTTP500Errors"
    namespace = "Custom/Application"
    value     = "1"
    default_value = "0"
  }
}

# Match requests with high latency from JSON logs
resource "aws_cloudwatch_log_metric_filter" "slow_requests" {
  name           = "slow-requests"
  pattern        = "{ $.responseTime > 3000 }"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "SlowRequests"
    namespace = "Custom/Application"
    value     = "1"
    default_value = "0"
  }
}

# Extract the actual response time as the metric value
resource "aws_cloudwatch_log_metric_filter" "response_time" {
  name           = "response-time"
  pattern        = "{ $.responseTime = * }"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "ResponseTime"
    namespace = "Custom/Application"
    # Use the actual field value as the metric value
    value     = "$.responseTime"
    unit      = "Milliseconds"
  }
}
```

## Complex Pattern Matching

Combine multiple conditions in filter patterns:

```hcl
# Match log entries with multiple conditions
resource "aws_cloudwatch_log_metric_filter" "auth_failures" {
  name           = "authentication-failures"
  # Match JSON logs where type is AUTH and status is FAILED
  pattern        = "{ $.eventType = \"AUTH\" && $.status = \"FAILED\" }"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "AuthenticationFailures"
    namespace = "Custom/Security"
    value     = "1"
    default_value = "0"
  }
}

# Monitor for specific exception types
resource "aws_cloudwatch_log_metric_filter" "out_of_memory" {
  name           = "out-of-memory"
  pattern        = "OutOfMemoryError"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "OutOfMemoryErrors"
    namespace = "Custom/Application"
    value     = "1"
    default_value = "0"
  }
}

# Track database connection failures
resource "aws_cloudwatch_log_metric_filter" "db_connection_error" {
  name           = "db-connection-error"
  pattern        = "?\"Connection refused\" ?\"Connection timed out\" ?\"Too many connections\""
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "DatabaseConnectionErrors"
    namespace = "Custom/Application"
    value     = "1"
    default_value = "0"
  }
}
```

## Security-Focused Metric Filters

Create metrics for security monitoring:

```hcl
# Track unauthorized API access attempts
resource "aws_cloudwatch_log_metric_filter" "unauthorized_api" {
  name           = "unauthorized-api-calls"
  pattern        = "{ $.errorCode = \"UnauthorizedAccess\" || $.errorCode = \"AccessDenied\" }"
  log_group_name = "/aws/cloudtrail"

  metric_transformation {
    name      = "UnauthorizedAPICalls"
    namespace = "Custom/Security"
    value     = "1"
    default_value = "0"
  }
}

# Monitor root account usage
resource "aws_cloudwatch_log_metric_filter" "root_usage" {
  name           = "root-account-usage"
  pattern        = "{ $.userIdentity.type = \"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != \"AwsServiceEvent\" }"
  log_group_name = "/aws/cloudtrail"

  metric_transformation {
    name      = "RootAccountUsage"
    namespace = "Custom/Security"
    value     = "1"
    default_value = "0"
  }
}

# Create alarm for root usage
resource "aws_cloudwatch_metric_alarm" "root_usage" {
  alarm_name          = "root-account-used"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RootAccountUsage"
  namespace           = "Custom/Security"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Root account activity detected"
  alarm_actions       = [aws_sns_topic.app_alerts.arn]
  treat_missing_data  = "notBreaching"
}

# Track console sign-in failures
resource "aws_cloudwatch_log_metric_filter" "console_login_failures" {
  name           = "console-login-failures"
  pattern        = "{ $.eventName = \"ConsoleLogin\" && $.errorMessage = \"Failed authentication\" }"
  log_group_name = "/aws/cloudtrail"

  metric_transformation {
    name      = "ConsoleLoginFailures"
    namespace = "Custom/Security"
    value     = "1"
    default_value = "0"
  }
}
```

## Business Metric Filters

Track business events through logs:

```hcl
# Count successful user registrations
resource "aws_cloudwatch_log_metric_filter" "user_registrations" {
  name           = "user-registrations"
  pattern        = "{ $.event = \"USER_REGISTERED\" && $.status = \"SUCCESS\" }"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "UserRegistrations"
    namespace = "Custom/Business"
    value     = "1"
    default_value = "0"
  }
}

# Track order values from logs
resource "aws_cloudwatch_log_metric_filter" "order_value" {
  name           = "order-value"
  pattern        = "{ $.event = \"ORDER_PLACED\" }"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "OrderValue"
    namespace = "Custom/Business"
    value     = "$.orderAmount"
    unit      = "None"
  }
}

# Track failed payment attempts
resource "aws_cloudwatch_log_metric_filter" "payment_failures" {
  name           = "payment-failures"
  pattern        = "{ $.event = \"PAYMENT_FAILED\" }"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name      = "PaymentFailures"
    namespace = "Custom/Business"
    value     = "1"
    default_value = "0"
  }
}
```

## Creating Metric Filters at Scale

Use a map-based approach for managing many filters:

```hcl
# Define metric filters as a variable
variable "metric_filters" {
  type = map(object({
    pattern       = string
    metric_name   = string
    namespace     = string
    value         = string
    default_value = string
  }))
  default = {
    "errors" = {
      pattern       = "ERROR"
      metric_name   = "ErrorCount"
      namespace     = "Custom/App"
      value         = "1"
      default_value = "0"
    }
    "warnings" = {
      pattern       = "WARN"
      metric_name   = "WarningCount"
      namespace     = "Custom/App"
      value         = "1"
      default_value = "0"
    }
    "timeouts" = {
      pattern       = "?\"timeout\" ?\"Timeout\" ?\"TIMEOUT\""
      metric_name   = "TimeoutCount"
      namespace     = "Custom/App"
      value         = "1"
      default_value = "0"
    }
  }
}

resource "aws_cloudwatch_log_metric_filter" "dynamic" {
  for_each = var.metric_filters

  name           = each.key
  pattern        = each.value.pattern
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name          = each.value.metric_name
    namespace     = each.value.namespace
    value         = each.value.value
    default_value = each.value.default_value
  }
}
```

## Best Practices

Use JSON-structured logging in your applications to enable precise pattern matching. Set default_value to 0 for count-based metrics so that CloudWatch reports zero rather than missing data during quiet periods. Test your filter patterns against actual log data before deploying since syntax errors result in no matches rather than errors. Use descriptive namespaces to organize your custom metrics logically. Create alarms on all security-related metric filters with immediate notification.

For advanced log analysis, see our guide on [CloudWatch anomaly detection](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudwatch-anomaly-detection-in-terraform/view).

## Conclusion

CloudWatch metric filters created through Terraform give you the ability to turn any log pattern into an alertable metric. From simple error counting to complex JSON field extraction and security monitoring, metric filters bridge the gap between logging and monitoring. Combined with CloudWatch alarms, they provide a powerful mechanism for detecting and responding to application issues in real time.
