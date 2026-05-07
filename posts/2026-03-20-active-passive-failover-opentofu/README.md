# How to Set Up Active-Passive Failover with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: High Availability, Active-Passive, Failover, OpenTofu, Route53, Health Check

Description: Learn how to configure active-passive failover using OpenTofu with Route53 failover routing, health checks, and standby infrastructure that activates automatically when primary fails.

## Overview

Active-passive failover routes all traffic to the primary environment while keeping a standby environment ready to take over if the primary fails. OpenTofu configures health checks, DNS failover records, and standby infrastructure.

## Step 1: Health Check Configuration

```hcl
# main.tf - Comprehensive health check for active-passive

resource "aws_route53_health_check" "primary_deep" {
  fqdn              = var.primary_alb_dns
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health/deep"  # Deep check includes DB connectivity
  failure_threshold = 3
  request_interval  = 10  # 10-second intervals for faster detection

  # Multi-region endpoint health check with latency graphs
  measure_latency                 = true
  enable_sni                      = true
  regions                         = ["us-east-1", "eu-west-1", "ap-southeast-1"]

  tags = { Name = "primary-deep-health-check" }
}
```

## Step 2: Route53 Failover Records

```hcl
# Primary record (active - receives all traffic)
resource "aws_route53_record" "primary" {
  zone_id        = aws_route53_zone.app.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "primary"

  alias {
    name                   = var.primary_alb_dns
    zone_id                = var.primary_alb_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.primary_deep.id
}

# Passive record (standby - receives traffic only when primary fails)
resource "aws_route53_record" "passive" {
  zone_id        = aws_route53_zone.app.zone_id
  name           = "app.example.com"
  type           = "A"
  set_identifier = "passive"

  alias {
    name                   = var.standby_alb_dns
    zone_id                = var.standby_alb_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "SECONDARY"
  }
  # No health check on secondary - it becomes active only when primary fails
}
```

## Step 3: SNS Notification for Health Check Failures

```hcl
# Alert when the primary health check fails
resource "aws_cloudwatch_metric_alarm" "route53_failover" {
  alarm_name          = "route53-health-check-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1  # 1 = healthy, 0 = unhealthy

  dimensions = {
    HealthCheckId = aws_route53_health_check.primary_deep.id
  }

  alarm_description = "Primary health check failed - Route53 failover condition detected"
  alarm_actions     = [aws_sns_topic.failover_notifications.arn]
  ok_actions        = [aws_sns_topic.failover_notifications.arn]
}

resource "aws_sns_topic" "failover_notifications" {
  name = "failover-notifications"
}

resource "aws_sns_topic_subscription" "email_notify" {
  topic_arn = aws_sns_topic.failover_notifications.arn
  protocol  = "email"
  endpoint  = var.ops_email
}
```

## Step 4: Passive Standby Readiness Check

```hcl
# Separate health check monitoring standby readiness
resource "aws_route53_health_check" "passive_readiness" {
  fqdn              = var.standby_alb_dns
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health/ready"
  failure_threshold = 1
  request_interval  = 30

  tags = { Name = "passive-readiness-check" }
}

# CloudWatch alarm if passive becomes unhealthy (failover target unavailable)
resource "aws_cloudwatch_metric_alarm" "passive_unhealthy" {
  alarm_name          = "passive-site-unhealthy"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  dimensions = {
    HealthCheckId = aws_route53_health_check.passive_readiness.id
  }

  alarm_description = "CRITICAL: Passive site is unhealthy. No failover available."
  alarm_actions     = [aws_sns_topic.failover_notifications.arn]
}
```

## Summary

Active-passive failover configured with OpenTofu uses Route53 health checks with 10-second intervals for rapid endpoint failure detection. The failover routing policy returns the SECONDARY record when Route53 considers the PRIMARY record unhealthy, but client-visible failover timing also depends on DNS caching. Monitoring the passive environment separately with a readiness alarm helps detect silent failures where the standby is also unhealthy, but that separate alarm does not control Route53 routing.
