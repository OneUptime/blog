# How to Implement Progressive Delivery Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Progressive Delivery, Canary, Feature Flags, DevOps

Description: Learn how to build progressive delivery infrastructure with Terraform, including canary deployments, feature flag systems, traffic splitting, and rollback automation for safe releases.

---

Progressive delivery is the practice of gradually rolling out changes to increasing percentages of users while monitoring for problems. Instead of deploying to all users at once, you start with a small percentage, validate the change is safe, and progressively increase until the rollout is complete. Terraform manages the infrastructure that makes this possible.

In this guide, we will cover how to build progressive delivery infrastructure with Terraform.

## Traffic Splitting Infrastructure

```hcl
# progressive/traffic-splitting.tf
# ALB-based traffic splitting for progressive delivery

variable "canary_weight" {
  description = "Percentage of traffic to route to canary (0-100)"
  type        = number
  default     = 0

  validation {
    condition     = var.canary_weight >= 0 && var.canary_weight <= 100
    error_message = "Canary weight must be between 0 and 100."
  }
}

# Stable version target group
resource "aws_lb_target_group" "stable" {
  name     = "app-stable-${var.environment}"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
  }

  deregistration_delay = 30
}

# Canary version target group
resource "aws_lb_target_group" "canary" {
  name     = "app-canary-${var.environment}"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
  }

  deregistration_delay = 30
}

# Weighted routing
resource "aws_lb_listener_rule" "progressive" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 100

  action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.stable.arn
        weight = 100 - var.canary_weight
      }

      target_group {
        arn    = aws_lb_target_group.canary.arn
        weight = var.canary_weight
      }

      stickiness {
        enabled  = true
        duration = 3600
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

## Canary Monitoring and Auto-Rollback

```hcl
# progressive/canary-monitoring.tf
# Automated canary analysis and rollback

# Monitor canary error rate
resource "aws_cloudwatch_metric_alarm" "canary_errors" {
  alarm_name          = "canary-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5  # 5% error rate triggers rollback

  metric_query {
    id          = "error_rate"
    expression  = "(errors / requests) * 100"
    label       = "Canary Error Rate"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        TargetGroup  = aws_lb_target_group.canary.arn_suffix
        LoadBalancer = aws_lb.main.arn_suffix
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        TargetGroup  = aws_lb_target_group.canary.arn_suffix
        LoadBalancer = aws_lb.main.arn_suffix
      }
    }
  }

  # Trigger rollback Lambda on alarm
  alarm_actions = [aws_lambda_function.canary_rollback.arn]
}

# Monitor canary latency
resource "aws_cloudwatch_metric_alarm" "canary_latency" {
  alarm_name          = "canary-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "p99"
  threshold           = 2.0  # 2 second p99

  dimensions = {
    TargetGroup  = aws_lb_target_group.canary.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_lambda_function.canary_rollback.arn]
}
```

## Progressive Rollout Pipeline

```yaml
# .github/workflows/progressive-delivery.yaml
name: Progressive Delivery

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: 'Container image tag to deploy'
        required: true

jobs:
  deploy-canary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Canary (5%)
        run: |
          terraform apply -auto-approve \
            -var="canary_image=${{ inputs.image_tag }}" \
            -var="canary_weight=5"

      - name: Wait and Monitor
        run: sleep 300  # 5 minutes

      - name: Check Canary Health
        run: python scripts/check-canary-health.py

  increase-to-25:
    needs: deploy-canary
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Increase to 25%
        run: |
          terraform apply -auto-approve \
            -var="canary_image=${{ inputs.image_tag }}" \
            -var="canary_weight=25"
      - name: Wait and Monitor
        run: sleep 600  # 10 minutes

  increase-to-50:
    needs: increase-to-25
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Increase to 50%
        run: |
          terraform apply -auto-approve \
            -var="canary_image=${{ inputs.image_tag }}" \
            -var="canary_weight=50"
      - name: Wait and Monitor
        run: sleep 600

  full-rollout:
    needs: increase-to-50
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Full Rollout (100%)
        run: |
          terraform apply -auto-approve \
            -var="stable_image=${{ inputs.image_tag }}" \
            -var="canary_weight=0"
```

## Best Practices

Start with a small canary percentage (1-5%) and increase gradually. This limits the blast radius if the new version has issues.

Monitor both error rates and latency during canary. Some issues manifest as latency increases before they cause errors.

Implement automated rollback. Human reaction time is too slow for production issues. Automated rollback based on health metrics protects users.

Use sticky sessions during progressive delivery. Users should consistently see either the stable or canary version, not switch between them.

Keep the rollback path fast and simple. Rolling back should be a single operation that sets canary_weight back to 0.

## Conclusion

Progressive delivery infrastructure with Terraform provides a safe, controlled way to release changes to production. By combining traffic splitting, canary monitoring, and automated rollback, you create a deployment pipeline that detects problems early and protects users automatically. The infrastructure investment in progressive delivery pays off in fewer production incidents and faster, more confident releases.
