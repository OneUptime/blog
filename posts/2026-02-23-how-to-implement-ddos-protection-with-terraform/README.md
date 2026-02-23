# How to Implement DDoS Protection with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, DDoS, Security, Shield, WAF

Description: Deploy AWS Shield Advanced and DDoS protection infrastructure with Terraform including WAF rate limiting, CloudFront, auto-scaling, and alerting.

---

DDoS attacks are a persistent threat to any internet-facing application. AWS provides multiple layers of DDoS protection, from the always-on Shield Standard to the comprehensive Shield Advanced service. Combining these with WAF, CloudFront, and auto-scaling creates a defense-in-depth approach. Managing all of this with Terraform ensures your DDoS protection is consistent and documented.

This guide covers deploying a complete DDoS protection strategy on AWS using Terraform.

## AWS Shield Standard vs Shield Advanced

Shield Standard is free and automatically enabled for all AWS accounts. It protects against common layer 3 and layer 4 DDoS attacks. Shield Advanced is a paid service ($3,000/month) that adds:

- Protection against larger, more sophisticated attacks
- DDoS Response Team (DRT) access
- Cost protection (credits for DDoS-related scaling)
- Advanced real-time metrics and reporting
- Proactive engagement

## Enable Shield Advanced

```hcl
# Enable Shield Advanced subscription
resource "aws_shield_subscription" "main" {
  auto_renew = "ENABLED"
}

# Protect specific resources
resource "aws_shield_protection" "alb" {
  name         = "${var.project}-alb-protection"
  resource_arn = aws_lb.main.arn

  depends_on = [aws_shield_subscription.main]

  tags = {
    Name        = "${var.project}-alb-ddos-protection"
    Environment = var.environment
  }
}

resource "aws_shield_protection" "cloudfront" {
  name         = "${var.project}-cloudfront-protection"
  resource_arn = aws_cloudfront_distribution.main.arn

  depends_on = [aws_shield_subscription.main]

  tags = {
    Name = "${var.project}-cloudfront-ddos-protection"
  }
}

resource "aws_shield_protection" "eip" {
  for_each = aws_eip.public

  name         = "${var.project}-eip-${each.key}-protection"
  resource_arn = each.value.arn

  depends_on = [aws_shield_subscription.main]
}
```

## Configure Shield Advanced Protection Groups

Group related resources for coordinated DDoS response:

```hcl
resource "aws_shield_protection_group" "web_tier" {
  protection_group_id = "${var.project}-web-tier"
  aggregation         = "MAX"
  pattern             = "BY_RESOURCE_TYPE"
  resource_type       = "APPLICATION_LOAD_BALANCER"

  depends_on = [aws_shield_subscription.main]

  tags = {
    Name = "${var.project}-web-tier-protection-group"
  }
}

resource "aws_shield_protection_group" "all_resources" {
  protection_group_id = "${var.project}-all-protected"
  aggregation         = "SUM"
  pattern             = "ALL"

  depends_on = [aws_shield_subscription.main]
}
```

## Enable Proactive Engagement

Shield Advanced can proactively engage the DDoS Response Team when it detects an attack:

```hcl
resource "aws_shield_proactive_engagement" "main" {
  enabled = true

  emergency_contact {
    email_address = var.security_team_email
    phone_number  = var.security_team_phone
    contact_notes = "Primary security on-call"
  }

  emergency_contact {
    email_address = var.ops_team_email
    phone_number  = var.ops_team_phone
    contact_notes = "Secondary - operations team"
  }

  depends_on = [aws_shield_subscription.main]
}
```

## CloudFront as a DDoS Shield

CloudFront absorbs DDoS traffic at the edge, keeping it away from your origin:

```hcl
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_All"

  # Associate WAF Web ACL
  web_acl_id = aws_wafv2_web_acl.cloudfront.arn

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.project}-cdn"
  }
}
```

## WAF Rate Limiting for Layer 7 DDoS

Layer 7 DDoS attacks mimic legitimate traffic. Rate limiting is your primary defense:

```hcl
resource "aws_wafv2_web_acl" "ddos_protection" {
  name  = "${var.project}-ddos-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Aggressive rate limiting
  rule {
    name     = "rate-limit-per-ip"
    priority = 1

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
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitPerIP"
      sampled_requests_enabled   = true
    }
  }

  # Block known bad IP reputation
  rule {
    name     = "ip-reputation"
    priority = 2

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
      metric_name                = "IPReputation"
      sampled_requests_enabled   = true
    }
  }

  # Geographic rate limiting for targeted attacks
  rule {
    name     = "geo-rate-limit"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"

        scope_down_statement {
          geo_match_statement {
            country_codes = var.high_risk_countries
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoRateLimit"
      sampled_requests_enabled   = true
    }
  }

  custom_response_body {
    key          = "rate-limited"
    content      = "Rate limit exceeded. Please try again later."
    content_type = "TEXT_PLAIN"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "DDoSWAFMetrics"
    sampled_requests_enabled   = true
  }
}
```

## Auto-Scaling for Absorption

When you cannot block all attack traffic, absorb it with auto-scaling:

```hcl
# Auto-scaling group with DDoS-aware scaling
resource "aws_autoscaling_group" "web" {
  name                = "${var.project}-web-asg"
  min_size            = var.min_instances
  max_size            = var.max_instances
  desired_capacity    = var.desired_instances
  vpc_zone_identifier = aws_subnet.private[*].id

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  target_group_arns = [aws_lb_target_group.web.arn]

  tag {
    key                 = "Name"
    value               = "${var.project}-web"
    propagate_at_launch = true
  }
}

# Scale out quickly when under attack
resource "aws_autoscaling_policy" "ddos_scale_out" {
  name                   = "ddos-scale-out"
  scaling_adjustment     = 4  # Add 4 instances at a time
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 60  # Short cooldown during attack
  autoscaling_group_name = aws_autoscaling_group.web.name
}

# Trigger scale out on high request count
resource "aws_cloudwatch_metric_alarm" "high_request_count" {
  alarm_name          = "ddos-high-request-count"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = var.request_count_threshold

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [
    aws_autoscaling_policy.ddos_scale_out.arn,
    aws_sns_topic.ddos_alerts.arn
  ]
}
```

## DDoS Alerting

Set up alerts so your team knows when an attack is happening:

```hcl
# Alert on Shield Advanced detected events
resource "aws_cloudwatch_metric_alarm" "ddos_detected" {
  alarm_name          = "ddos-attack-detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DDoSDetected"
  namespace           = "AWS/DDoSProtection"
  period              = 60
  statistic           = "Sum"
  threshold           = 0

  dimensions = {
    ResourceArn = aws_lb.main.arn
  }

  alarm_actions = [aws_sns_topic.ddos_alerts.arn]
}

resource "aws_sns_topic" "ddos_alerts" {
  name              = "${var.project}-ddos-alerts"
  kms_master_key_id = aws_kms_key.alerts.id
}

resource "aws_sns_topic_subscription" "ddos_pagerduty" {
  topic_arn = aws_sns_topic.ddos_alerts.arn
  protocol  = "https"
  endpoint  = var.pagerduty_webhook_url
}
```

## Summary

DDoS protection on AWS is a layered approach: CloudFront absorbs and distributes traffic at the edge, WAF rate limits filter layer 7 attacks, Shield Advanced detects and mitigates large-scale attacks, and auto-scaling absorbs what gets through. Managing all of these layers with Terraform ensures they are deployed consistently and stay in sync as your application evolves.

For related topics, see [how to implement WAF rules with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-waf-rules-with-terraform/view) and [how to implement network segmentation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-network-segmentation-with-terraform/view).
