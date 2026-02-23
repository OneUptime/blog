# How to Configure WAF Rules with Rate Limiting in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, WAF, Rate Limiting, AWS, Security, API Protection, Web Security

Description: Learn how to configure AWS WAF rules with rate limiting using Terraform to protect your web applications from abuse, brute force attacks, and excessive traffic.

---

AWS WAF (Web Application Firewall) with rate limiting provides a powerful combination for protecting your web applications from abuse. Rate-based rules automatically block IP addresses that exceed a configured request threshold within a five-minute window. This protects against brute force login attempts, API abuse, web scraping, and simple layer 7 DDoS attacks. Terraform lets you define these WAF rules as infrastructure as code, ensuring consistent protection across all your environments.

## How WAF Rate Limiting Works

WAF rate-based rules count the number of requests from each source IP address over a rolling five-minute period. When an IP exceeds the configured limit, WAF blocks subsequent requests from that IP until the rate drops below the threshold. You can scope rate limiting to specific URL paths, HTTP methods, or other request attributes using scope-down statements.

The minimum rate limit in AWS WAF is 100 requests per five minutes. AWS evaluates the rate approximately every 30 seconds.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a resource to protect (ALB, API Gateway, CloudFront distribution, or AppSync API).

## Basic Rate Limiting Setup

Create a WAF Web ACL with a simple rate-based rule:

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

# WAF Web ACL with rate limiting
resource "aws_wafv2_web_acl" "main" {
  name  = "rate-limiting-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Global rate limit - block IPs exceeding 2000 requests per 5 minutes
  rule {
    name     = "global-rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GlobalRateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "RateLimitingACL"
    sampled_requests_enabled   = true
  }

  tags = { Name = "rate-limiting-acl" }
}
```

## Scoped Rate Limiting for Specific Paths

Apply different rate limits to different URL paths:

```hcl
# Rate limit for login endpoint (stricter)
rule {
  name     = "login-rate-limit"
  priority = 2

  action {
    block {
      custom_response {
        response_code = 429
        custom_response_body_key = "rate-limited"
      }
    }
  }

  statement {
    rate_based_statement {
      limit              = 100
      aggregate_key_type = "IP"

      scope_down_statement {
        and_statement {
          statement {
            byte_match_statement {
              search_string = "/login"
              field_to_match {
                uri_path {}
              }
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
              positional_constraint = "STARTS_WITH"
            }
          }

          statement {
            byte_match_statement {
              search_string = "post"
              field_to_match {
                method {}
              }
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
              positional_constraint = "EXACTLY"
            }
          }
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "LoginRateLimit"
    sampled_requests_enabled   = true
  }
}
```

## Complete WAF Configuration with Multiple Rules

Here is a comprehensive WAF setup with multiple rate limiting and security rules:

```hcl
resource "aws_wafv2_web_acl" "comprehensive" {
  name  = "comprehensive-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Custom response body for rate-limited requests
  custom_response_body {
    key          = "rate-limited"
    content      = "{\"error\": \"Too many requests. Please try again later.\"}"
    content_type = "APPLICATION_JSON"
  }

  # Rule 1: AWS Managed Core Rule Set
  rule {
    name     = "aws-managed-core-rules"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CoreRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed Known Bad Inputs
  rule {
    name     = "aws-known-bad-inputs"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: SQL Injection Protection
  rule {
    name     = "aws-sql-injection"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjection"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Global rate limit
  rule {
    name     = "global-rate-limit"
    priority = 10

    action {
      block {
        custom_response {
          response_code            = 429
          custom_response_body_key = "rate-limited"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GlobalRateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: Login rate limit
  rule {
    name     = "login-rate-limit"
    priority = 11

    action {
      block {
        custom_response {
          response_code            = 429
          custom_response_body_key = "rate-limited"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string = "/auth/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "STARTS_WITH"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "LoginRateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 6: API rate limit
  rule {
    name     = "api-rate-limit"
    priority = 12

    action {
      block {
        custom_response {
          response_code            = 429
          custom_response_body_key = "rate-limited"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string = "/api/"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "STARTS_WITH"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "APIRateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 7: Block requests with no user agent
  rule {
    name     = "block-no-user-agent"
    priority = 20

    action {
      block {}
    }

    statement {
      size_constraint_statement {
        comparison_operator = "EQ"
        size                = 0
        field_to_match {
          single_header {
            name = "user-agent"
          }
        }
        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockNoUserAgent"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ComprehensiveWAF"
    sampled_requests_enabled   = true
  }

  tags = { Name = "comprehensive-waf" }
}
```

## Associating WAF with Resources

Attach the WAF ACL to your resources:

```hcl
# Associate with an ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.comprehensive.arn
}

# Associate with API Gateway
resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = aws_api_gateway_stage.production.arn
  web_acl_arn  = aws_wafv2_web_acl.comprehensive.arn
}
```

## WAF Logging

Enable logging to track rule matches and blocked requests:

```hcl
# CloudWatch log group for WAF logs
resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-comprehensive"
  retention_in_days = 30
}

# WAF logging configuration
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.comprehensive.arn

  # Only log blocked and counted requests
  logging_filter {
    default_behavior = "DROP"

    filter {
      behavior    = "KEEP"
      requirement = "MEETS_ANY"

      condition {
        action_condition {
          action = "BLOCK"
        }
      }

      condition {
        action_condition {
          action = "COUNT"
        }
      }
    }
  }
}
```

## CloudWatch Alarms for Rate Limiting

Set up alerts when rate limiting activates:

```hcl
# Alarm when rate limiting blocks requests
resource "aws_cloudwatch_metric_alarm" "rate_limit_triggered" {
  alarm_name          = "waf-rate-limit-triggered"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "WAF rate limiting has blocked more than 100 requests"

  dimensions = {
    WebACL = aws_wafv2_web_acl.comprehensive.name
    Rule   = "GlobalRateLimit"
    Region = "us-east-1"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  name = "waf-alerts"
}
```

## Outputs

```hcl
output "waf_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.comprehensive.arn
}

output "waf_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.comprehensive.id
}
```

## Monitoring WAF and Rate Limiting

Monitor your WAF rules and rate limiting effectiveness with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-waf-rules-with-rate-limiting-in-terraform/view) to identify attack patterns and fine-tune your rate limits based on legitimate traffic patterns.

## Best Practices

Start with higher rate limits and lower them based on observed traffic patterns. Use scope-down statements to apply stricter limits to sensitive endpoints. Always include managed rule groups for baseline protection. Return HTTP 429 status codes for rate-limited requests so clients can implement proper retry logic. Enable logging and monitor for false positives.

## Conclusion

WAF rules with rate limiting in Terraform provide robust application-layer protection that is consistent, version-controlled, and easy to tune. By combining rate-based rules with managed rule groups and custom rules, you create a comprehensive defense against web application attacks. Terraform ensures these protections are applied consistently across all environments and resources.
