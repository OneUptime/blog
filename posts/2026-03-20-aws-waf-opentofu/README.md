# How to Configure AWS WAF with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, WAF, Web Application Firewall, Security, DDoS Protection, Infrastructure as Code

Description: Learn how to configure AWS WAF v2 with OpenTofu to protect web applications from common exploits, SQL injection, XSS attacks, and bot traffic using managed rule groups.

## Introduction

AWS WAF v2 (Web Application Firewall) inspects HTTP requests to CloudFront distributions, API Gateway, Application Load Balancers, and AppSync. It uses rules to allow, block, or count requests based on IP addresses, HTTP headers, body content, and URI strings. AWS Managed Rules provide pre-built protection against OWASP Top 10 risks and known bad inputs without requiring manual rule authoring.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with WAF and resource permissions
- An ALB, CloudFront distribution, or API Gateway to protect

## Step 1: Create WAF Web ACL with Managed Rules

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "${var.project_name}-web-acl"
  scope = "REGIONAL"  # Use "CLOUDFRONT" with an AWS provider configured for us-east-1

  default_action {
    allow {}  # Allow by default, block explicitly
  }

  # AWS Core Rule Set - protects against OWASP Top 10
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}  # Use rule group's default action (block)
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Override specific rules if they cause false positives
        rule_action_override {
          action_to_use { count {} }
          name = "SizeRestrictions_BODY"  # Count large bodies instead of blocking
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Known bad inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 20

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputsMetric"
      sampled_requests_enabled   = true
    }
  }

  # SQL injection protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 30

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-web-acl"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${var.project_name}-web-acl"
    Environment = var.environment
  }
}
```

## Step 2: Add IP Rate Limiting Rule

Add this `rule` block inside `aws_wafv2_web_acl.main`:

```hcl
rule {
  # Rate-limit individual IPs to 1000 requests per 5 minutes
  name     = "RateLimitPerIP"
  priority = 5  # Check before managed rules

  action {
    block {}
  }

  statement {
    rate_based_statement {
      limit              = 1000  # Max requests per 5-minute window per IP
      aggregate_key_type = "IP"
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "RateLimitMetric"
    sampled_requests_enabled   = true
  }
}
```

## Step 3: Associate WAF with ALB

```hcl
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

## Step 4: Enable WAF Logging

```hcl
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [var.kinesis_firehose_arn]  # Firehose stream name must start with aws-waf-logs-
  resource_arn            = aws_wafv2_web_acl.main.arn

  # AWS WAF logs all requests unless you add a logging_filter
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check blocked requests for a regional Web ACL in us-east-1

aws cloudwatch get-metric-statistics \
  --region us-east-1 \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=my-project-web-acl Name=Rule,Value=ALL Name=Region,Value=us-east-1 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum
```

## Conclusion

Start WAF deployment in `count` mode to understand your traffic patterns before enabling blocking-this prevents false positives from impacting legitimate users. For managed rule groups, change `override_action` from `none {}` to `count {}` during tuning, and for custom rules such as rate limiting, use `action { count {} }` before switching to `block`. Once you've reviewed sampled requests and tuned any necessary rule overrides, switch to block mode. AWS Managed Rules provide substantial protection without custom rule authoring and are regularly updated by AWS as new threats emerge.
