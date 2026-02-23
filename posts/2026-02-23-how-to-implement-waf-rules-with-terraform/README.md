# How to Implement WAF Rules with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, WAF, Security, Web Application Firewall

Description: Deploy and configure AWS WAF rules with Terraform including managed rule groups, custom rules, rate limiting, and integration with ALB and CloudFront.

---

AWS WAF lets you control HTTP and HTTPS traffic that reaches your web applications. You can block SQL injection attempts, cross-site scripting, bad bots, and other common attack patterns. Managing WAF rules with Terraform means your web application firewall configuration is version-controlled, reviewed, and applied consistently across all your endpoints.

This guide covers building a complete WAF configuration with Terraform, from AWS managed rule groups to custom rules tailored to your application.

## Create the Web ACL

The Web ACL is the container for all your WAF rules. Start with a default action and add rules:

```hcl
resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project}-waf"
  description = "WAF rules for ${var.project}"
  scope       = "REGIONAL"  # Use CLOUDFRONT for CloudFront distributions

  default_action {
    allow {}
  }

  # Visibility config for the entire Web ACL
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-waf-metrics"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${var.project}-waf"
    Environment = var.environment
  }
}
```

## Add AWS Managed Rule Groups

AWS provides managed rule groups that cover the most common attack patterns. These are maintained by AWS and updated automatically:

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # AWS Core Rule Set - covers common web exploits
  rule {
    name     = "aws-managed-common-rules"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude rules that cause false positives for your app
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleMetrics"
      sampled_requests_enabled   = true
    }
  }

  # SQL Injection protection
  rule {
    name     = "aws-managed-sql-injection"
    priority = 20

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
      metric_name                = "SQLInjectionMetrics"
      sampled_requests_enabled   = true
    }
  }

  # Known bad inputs
  rule {
    name     = "aws-managed-known-bad-inputs"
    priority = 30

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
      metric_name                = "KnownBadInputMetrics"
      sampled_requests_enabled   = true
    }
  }

  # Bot control
  rule {
    name     = "aws-managed-bot-control"
    priority = 40

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "COMMON"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BotControlMetrics"
      sampled_requests_enabled   = true
    }
  }

  # IP reputation list
  rule {
    name     = "aws-managed-ip-reputation"
    priority = 50

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "IPReputationMetrics"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-waf-metrics"
    sampled_requests_enabled   = true
  }
}
```

## Add Rate Limiting

Protect your application from brute force attacks and abuse:

```hcl
# Add to the web ACL
rule {
  name     = "rate-limit-overall"
  priority = 5

  action {
    block {}
  }

  statement {
    rate_based_statement {
      limit              = 2000  # Requests per 5-minute window per IP
      aggregate_key_type = "IP"
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "RateLimitMetrics"
    sampled_requests_enabled   = true
  }
}

# Stricter rate limit on login endpoints
rule {
  name     = "rate-limit-login"
  priority = 6

  action {
    block {}
  }

  statement {
    rate_based_statement {
      limit              = 100  # Much stricter for auth endpoints
      aggregate_key_type = "IP"

      scope_down_statement {
        byte_match_statement {
          search_string         = "/api/auth/login"
          positional_constraint = "STARTS_WITH"

          field_to_match {
            uri_path {}
          }

          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "LoginRateLimitMetrics"
    sampled_requests_enabled   = true
  }
}
```

## Custom Rules

Write rules specific to your application:

```hcl
# Block requests from specific countries
rule {
  name     = "geo-restriction"
  priority = 2

  action {
    block {}
  }

  statement {
    geo_match_statement {
      country_codes = var.blocked_countries
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "GeoBlockMetrics"
    sampled_requests_enabled   = true
  }
}

# Block requests with suspicious headers
rule {
  name     = "block-bad-user-agents"
  priority = 3

  action {
    block {}
  }

  statement {
    or_statement {
      statement {
        byte_match_statement {
          search_string         = "sqlmap"
          positional_constraint = "CONTAINS"
          field_to_match {
            single_header {
              name = "user-agent"
            }
          }
          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }
      statement {
        byte_match_statement {
          search_string         = "nikto"
          positional_constraint = "CONTAINS"
          field_to_match {
            single_header {
              name = "user-agent"
            }
          }
          text_transformation {
            priority = 0
            type     = "LOWERCASE"
          }
        }
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "BadUserAgentMetrics"
    sampled_requests_enabled   = true
  }
}
```

## IP Allow and Block Lists

Manage IP-based access control:

```hcl
# IP set for allowed IPs
resource "aws_wafv2_ip_set" "allowed_ips" {
  name               = "${var.project}-allowed-ips"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.allowed_ip_cidrs

  tags = { Name = "${var.project}-allowed-ips" }
}

# IP set for blocked IPs
resource "aws_wafv2_ip_set" "blocked_ips" {
  name               = "${var.project}-blocked-ips"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.blocked_ip_cidrs

  tags = { Name = "${var.project}-blocked-ips" }
}

# Block rule using the IP set
rule {
  name     = "block-bad-ips"
  priority = 1

  action {
    block {}
  }

  statement {
    ip_set_reference_statement {
      arn = aws_wafv2_ip_set.blocked_ips.arn
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "BlockedIPMetrics"
    sampled_requests_enabled   = true
  }
}
```

## Associate WAF with Resources

Attach the Web ACL to your ALB or API Gateway:

```hcl
# Associate with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# Associate with API Gateway
resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = aws_apigatewayv2_stage.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

## Enable WAF Logging

Log all WAF decisions for security analysis:

```hcl
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.main.arn

  # Only log blocked requests to reduce volume
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

# Log group must start with aws-waf-logs-
resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-${var.project}"
  retention_in_days = 90
}
```

## Summary

AWS WAF with Terraform gives you a layered defense for your web applications. Start with the AWS managed rule groups to cover the most common attack patterns, add rate limiting for abuse prevention, and build custom rules for your specific application needs. The key is to start in count mode (monitoring only) so you can tune rules before blocking traffic. Once you are confident in your rules, switch to block mode and enable logging for ongoing security monitoring.

For related security topics, see [how to implement DDoS protection with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-ddos-protection-with-terraform/view) and [how to implement security groups best practices with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-security-groups-best-practices-with-terraform/view).
