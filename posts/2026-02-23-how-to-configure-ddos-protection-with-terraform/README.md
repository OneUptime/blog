# How to Configure DDoS Protection with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DDoS Protection, AWS Shield, WAF, Security, Networking, CloudFront

Description: Learn how to configure DDoS protection with Terraform using AWS Shield Advanced, WAF rate limiting, and CloudFront for comprehensive attack mitigation.

---

Distributed Denial of Service (DDoS) attacks overwhelm your infrastructure with traffic, making your application unavailable to legitimate users. AWS provides multiple layers of DDoS protection, from the always-on AWS Shield Standard to the advanced protections of Shield Advanced, WAF rate limiting, and CloudFront. Terraform enables you to configure all these protection layers as infrastructure as code, ensuring your DDoS defenses are consistent and reproducible.

## AWS DDoS Protection Layers

AWS Shield Standard is automatically included with all AWS accounts at no extra cost. It protects against common layer 3 and layer 4 attacks. AWS Shield Advanced provides enhanced protection, including real-time attack visibility, a DDoS response team, and cost protection. AWS WAF provides application-layer protection through rate limiting and custom rules. CloudFront absorbs and distributes attack traffic across the global edge network.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and for Shield Advanced, an active subscription (which has a monthly fee).

## Enabling Shield Advanced

Subscribe to and configure Shield Advanced:

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

# Enable Shield Advanced subscription
resource "aws_shield_subscription" "main" {
  auto_renew = "ENABLED"
}
```

## Protecting Resources with Shield Advanced

Associate Shield Advanced protection with specific resources:

```hcl
# Protect an Application Load Balancer
resource "aws_shield_protection" "alb" {
  name         = "alb-protection"
  resource_arn = aws_lb.main.arn

  depends_on = [aws_shield_subscription.main]

  tags = { Name = "alb-ddos-protection" }
}

# Protect a CloudFront distribution
resource "aws_shield_protection" "cloudfront" {
  name         = "cloudfront-protection"
  resource_arn = aws_cloudfront_distribution.main.arn

  depends_on = [aws_shield_subscription.main]

  tags = { Name = "cloudfront-ddos-protection" }
}

# Protect an Elastic IP (for EC2 or NLB)
resource "aws_shield_protection" "eip" {
  name         = "eip-protection"
  resource_arn = "arn:aws:ec2:us-east-1:${data.aws_caller_identity.current.account_id}:eip-allocation/${aws_eip.main.id}"

  depends_on = [aws_shield_subscription.main]

  tags = { Name = "eip-ddos-protection" }
}

# Protect a Route 53 hosted zone
resource "aws_shield_protection" "route53" {
  name         = "route53-protection"
  resource_arn = "arn:aws:route53:::hostedzone/${data.aws_route53_zone.main.zone_id}"

  depends_on = [aws_shield_subscription.main]

  tags = { Name = "route53-ddos-protection" }
}

data "aws_caller_identity" "current" {}
```

## Creating a Shield Advanced Protection Group

Group related resources for coordinated protection:

```hcl
# Protection group for the web application
resource "aws_shield_protection_group" "web_app" {
  protection_group_id = "web-application"
  aggregation         = "SUM"
  pattern             = "ARBITRARY"

  members = [
    aws_shield_protection.alb.resource_arn,
    aws_shield_protection.cloudfront.resource_arn,
  ]

  depends_on = [aws_shield_subscription.main]

  tags = { Name = "web-app-protection-group" }
}

# Protection group for all resources of a specific type
resource "aws_shield_protection_group" "all_albs" {
  protection_group_id = "all-load-balancers"
  aggregation         = "MEAN"
  pattern             = "BY_RESOURCE_TYPE"
  resource_type       = "APPLICATION_LOAD_BALANCER"

  depends_on = [aws_shield_subscription.main]

  tags = { Name = "all-albs-protection-group" }
}
```

## WAF Rate Limiting Rules

Create WAF rules to limit request rates and prevent application-layer DDoS:

```hcl
# WAF Web ACL with DDoS protection rules
resource "aws_wafv2_web_acl" "ddos_protection" {
  name  = "ddos-protection-acl"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule - block IPs that exceed request threshold
  rule {
    name     = "rate-limit-overall"
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
      metric_name                = "RateLimitOverall"
      sampled_requests_enabled   = true
    }
  }

  # Rate limit for login endpoints
  rule {
    name     = "rate-limit-login"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
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
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitLogin"
      sampled_requests_enabled   = true
    }
  }

  # Block known bad user agents
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
            search_string = "scanner"
            field_to_match {
              single_header {
                name = "user-agent"
              }
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "CONTAINS"
          }
        }

        statement {
          byte_match_statement {
            search_string = "bot"
            field_to_match {
              single_header {
                name = "user-agent"
              }
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "CONTAINS"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockBadUserAgents"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rule - Bot Control
  rule {
    name     = "aws-bot-control"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BotControl"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "DDOSProtectionACL"
    sampled_requests_enabled   = true
  }

  tags = { Name = "ddos-protection-acl" }
}

# Associate WAF with the ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.ddos_protection.arn
}
```

## CloudFront as DDoS Shield

Use CloudFront to absorb and distribute attack traffic:

```hcl
# CloudFront distribution for DDoS absorption
resource "aws_cloudfront_distribution" "protected" {
  enabled = true

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALBOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALBOrigin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Geo restriction to block traffic from specific countries
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # Associate with WAF
  web_acl_id = aws_wafv2_web_acl.ddos_cloudfront.arn

  tags = { Name = "ddos-protected-distribution" }
}
```

## CloudWatch Alarms for DDoS Detection

Set up alarms to detect potential attacks:

```hcl
# Alarm for high request rate
resource "aws_cloudwatch_metric_alarm" "high_request_rate" {
  alarm_name          = "high-request-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10000
  alarm_description   = "Triggers when request rate exceeds normal levels"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# SNS topic for DDoS alerts
resource "aws_sns_topic" "alerts" {
  name = "ddos-alerts"
}
```

## Outputs

```hcl
output "shield_protection_ids" {
  description = "Shield Advanced protection IDs"
  value = {
    alb        = aws_shield_protection.alb.id
    cloudfront = aws_shield_protection.cloudfront.id
  }
}

output "waf_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = aws_wafv2_web_acl.ddos_protection.arn
}
```

## Monitoring DDoS Protection

Monitor your DDoS protection with [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-ddos-protection-with-terraform/view) to track attack patterns, mitigation effectiveness, and application availability during attack events.

## Best Practices

Layer your defenses with Shield, WAF, and CloudFront together. Set rate limits based on your normal traffic patterns. Enable CloudWatch metrics on all WAF rules for visibility. Use Shield Advanced protection groups to correlate attacks across resources. Regularly review WAF logs for false positives. Test your DDoS mitigation plan with simulated attacks.

## Conclusion

DDoS protection with Terraform provides a comprehensive, multi-layered defense strategy. By combining AWS Shield Advanced, WAF rate limiting, CloudFront distribution, and CloudWatch alerting, you create resilient infrastructure that can withstand and mitigate attacks. Managing all of this as Terraform code means your protection is consistent, version-controlled, and quickly deployable across environments.
