# How to Configure Route 53 Health Checks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Route 53, Health Check, DNS Failover, High Availability, Infrastructure as Code

Description: Learn how to configure Route 53 health checks with OpenTofu to monitor endpoint availability and trigger automatic DNS failover when endpoints become unhealthy.

## Introduction

Route 53 health checks monitor the health of your web servers, load balancers, and other endpoints. When an endpoint fails health checks, Route 53 can automatically stop returning the failing record in DNS responses or fail over to a backup endpoint. Health checks can monitor HTTP/HTTPS endpoints, TCP connections, or other CloudWatch alarms.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Route 53 permissions
- Endpoints to monitor

## Step 1: Create HTTP/HTTPS Health Check

```hcl
resource "aws_route53_health_check" "primary_api" {
  # Use a name that resolves directly to the primary endpoint, not the failover record.
  fqdn              = "primary-api.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3  # Mark unhealthy after 3 consecutive failures
  request_interval  = 30  # Check every 30 seconds (10 or 30)

  # Enable latency monitoring
  measure_latency = true

  # Enable monitoring from multiple regions
  regions = [
    "us-east-1",
    "eu-west-1",
    "ap-southeast-1"
  ]

  tags = {
    Name = "${var.project_name}-api-health-check"
  }
}
```

## Step 2: CloudWatch Alarm-Based Health Check

```hcl
# Health check based on an existing CloudWatch alarm

resource "aws_route53_health_check" "cloudwatch_based" {
  type = "CLOUDWATCH_METRIC"

  cloudwatch_alarm_name   = var.service_health_alarm_name
  cloudwatch_alarm_region = var.region

  # How to treat insufficient data
  insufficient_data_health_status = "Unhealthy"  # or "Healthy", "LastKnownStatus"

  tags = {
    Name = "${var.project_name}-cloudwatch-health-check"
  }
}
```

## Step 3: Calculated Health Check (Combine Multiple)

```hcl
# Healthy only if ALL child health checks are healthy
resource "aws_route53_health_check" "all_healthy" {
  type = "CALCULATED"

  child_health_threshold = 2  # All 2 children must be healthy
  child_healthchecks = [
    aws_route53_health_check.primary_api.id,
    aws_route53_health_check.cloudwatch_based.id
  ]

  tags = {
    Name = "${var.project_name}-all-components-healthy"
  }
}
```

## Step 4: Alert on Health Check Failures

```hcl
# Route 53 health check metrics are always in us-east-1
resource "aws_cloudwatch_metric_alarm" "health_check_failed" {
  provider = aws.us_east_1  # Health check metrics are global, published to us-east-1

  alarm_name          = "${var.project_name}-health-check-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1  # 1=healthy, 0=unhealthy

  dimensions = {
    HealthCheckId = aws_route53_health_check.primary_api.id
  }

  alarm_actions = [var.sns_topic_arn]
}
```

## Step 5: Use Health Check with DNS Record

```hcl
resource "aws_route53_record" "api_primary" {
  zone_id = var.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  set_identifier = "primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.primary_api.id

  alias {
    name                   = var.primary_alb_dns
    zone_id                = var.primary_alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_secondary" {
  zone_id = var.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  set_identifier = "secondary"

  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = var.secondary_alb_dns
    zone_id                = var.secondary_alb_zone_id
    evaluate_target_health = true
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check health check status
aws route53 get-health-check-status \
  --health-check-id <health-check-id>
```

## Conclusion

A common starting point for Route 53 endpoint health checks is `failure_threshold = 3` and `request_interval = 30` for a balance between detection speed (roughly 90 seconds before DNS TTL and resolver caching effects) and avoiding false positives from transient failures. For critical services, use calculated health checks combining endpoint checks with CloudWatch alarm-based checks for comprehensive monitoring. Remember that Route 53 health check metrics are always published to `us-east-1` regardless of your resource region.
