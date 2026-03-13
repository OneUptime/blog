# How to Implement Canary Deployments with Terraform CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Canary Deployments, CI/CD, DevOps, Infrastructure as Code, Progressive Delivery

Description: Learn how to implement canary deployment patterns with Terraform CI/CD pipelines using weighted routing, health monitoring, automated promotion, and rollback mechanisms.

---

Canary deployments let you test infrastructure changes on a small percentage of traffic before rolling them out to everyone. Instead of deploying to all instances at once or maintaining two full environments like blue-green, you route a small slice of traffic to instances running the new version. If metrics look good, you gradually increase the percentage. If something breaks, only a fraction of users are affected.

## Canary vs Blue-Green

Blue-green deployments maintain two full environments and switch all traffic at once. Canary deployments are more gradual:

- **Blue-green**: 100% on old, then 100% on new
- **Canary**: 100% on old, then 95/5, then 80/20, then 50/50, then 100% on new

Canary is better when you want to detect issues that only show up under partial load or when you cannot afford to run two full production environments.

## Architecture

The canary pattern with Terraform involves:

1. A base deployment (the stable version)
2. A canary deployment (the new version, smaller scale)
3. A weighted load balancer that splits traffic between them
4. A monitoring system that validates the canary's health

```hcl
# main.tf - Canary deployment infrastructure
variable "canary_enabled" {
  description = "Whether to deploy a canary alongside the stable version"
  type        = bool
  default     = false
}

variable "canary_weight" {
  description = "Percentage of traffic to send to canary (0-100)"
  type        = number
  default     = 5

  validation {
    condition     = var.canary_weight >= 0 && var.canary_weight <= 100
    error_message = "canary_weight must be between 0 and 100"
  }
}

variable "stable_version" {
  description = "Current stable application version"
  type        = string
}

variable "canary_version" {
  description = "Canary application version to test"
  type        = string
  default     = ""
}
```

```hcl
# stable.tf - The stable (production) deployment
resource "aws_ecs_service" "stable" {
  name            = "app-stable"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.stable.arn
  desired_count   = 5

  load_balancer {
    target_group_arn = aws_lb_target_group.stable.arn
    container_name   = "app"
    container_port   = 8080
  }
}

resource "aws_ecs_task_definition" "stable" {
  family = "app-stable"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "myregistry.com/app:${var.stable_version}"
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "DEPLOYMENT_TYPE"
          value = "stable"
        }
      ]
    }
  ])
}

resource "aws_lb_target_group" "stable" {
  name        = "app-stable"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 10
  }
}
```

```hcl
# canary.tf - The canary deployment (only when enabled)
resource "aws_ecs_service" "canary" {
  count = var.canary_enabled ? 1 : 0

  name            = "app-canary"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.canary[0].arn
  desired_count   = 1  # Minimal instance count for canary

  load_balancer {
    target_group_arn = aws_lb_target_group.canary[0].arn
    container_name   = "app"
    container_port   = 8080
  }
}

resource "aws_ecs_task_definition" "canary" {
  count  = var.canary_enabled ? 1 : 0
  family = "app-canary"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "myregistry.com/app:${var.canary_version}"
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "DEPLOYMENT_TYPE"
          value = "canary"
        }
      ]
    }
  ])
}

resource "aws_lb_target_group" "canary" {
  count = var.canary_enabled ? 1 : 0

  name        = "app-canary"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 10
  }
}
```

```hcl
# routing.tf - Weighted traffic distribution
resource "aws_lb_listener_rule" "weighted" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type = "forward"

    dynamic "forward" {
      for_each = var.canary_enabled ? [1] : []
      content {
        target_group {
          arn    = aws_lb_target_group.stable.arn
          weight = 100 - var.canary_weight
        }
        target_group {
          arn    = aws_lb_target_group.canary[0].arn
          weight = var.canary_weight
        }
      }
    }

    # When canary is not enabled, send all traffic to stable
    dynamic "forward" {
      for_each = var.canary_enabled ? [] : [1]
      content {
        target_group {
          arn    = aws_lb_target_group.stable.arn
          weight = 100
        }
      }
    }
  }

  condition {
    host_header {
      values = ["app.mycompany.com"]
    }
  }
}
```

## CI/CD Pipeline for Canary Deployments

```yaml
# .github/workflows/canary-deploy.yml
name: Canary Deployment

on:
  workflow_dispatch:
    inputs:
      canary_version:
        description: "Version to deploy as canary"
        required: true
        type: string

permissions:
  id-token: write
  contents: read

jobs:
  deploy-canary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Deploy canary at 5% traffic
        run: |
          cd terraform
          terraform init -no-color
          terraform apply -no-color -auto-approve \
            -var="canary_enabled=true" \
            -var="canary_version=${{ inputs.canary_version }}" \
            -var="canary_weight=5"

  monitor-canary:
    needs: deploy-canary
    runs-on: ubuntu-latest
    steps:
      - name: Monitor canary health for 10 minutes
        run: |
          echo "Monitoring canary metrics..."
          MONITORING_DURATION=600  # 10 minutes
          CHECK_INTERVAL=30
          ELAPSED=0

          while [ $ELAPSED -lt $MONITORING_DURATION ]; do
            # Check canary error rate from CloudWatch
            ERROR_RATE=$(aws cloudwatch get-metric-statistics \
              --namespace "App/Canary" \
              --metric-name "ErrorRate" \
              --dimensions Name=DeploymentType,Value=canary \
              --start-time "$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S)" \
              --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
              --period 60 \
              --statistics Average \
              --query 'Datapoints[0].Average' \
              --output text 2>/dev/null || echo "0")

            echo "Canary error rate: ${ERROR_RATE}%"

            # Fail if error rate exceeds 5%
            if [ "$(echo "$ERROR_RATE > 5" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
              echo "ERROR: Canary error rate ${ERROR_RATE}% exceeds 5% threshold"
              exit 1
            fi

            sleep $CHECK_INTERVAL
            ELAPSED=$((ELAPSED + CHECK_INTERVAL))
          done

          echo "Canary looks healthy after ${MONITORING_DURATION}s"

  promote-canary:
    needs: monitor-canary
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Gradually increase canary traffic
        run: |
          cd terraform
          terraform init -no-color

          # Step through traffic percentages
          for weight in 25 50 75 100; do
            echo "Setting canary weight to ${weight}%"
            terraform apply -no-color -auto-approve \
              -var="canary_enabled=true" \
              -var="canary_version=${{ github.event.inputs.canary_version }}" \
              -var="canary_weight=$weight"

            # Wait and monitor between steps
            if [ $weight -lt 100 ]; then
              echo "Monitoring for 5 minutes at ${weight}%..."
              sleep 300
            fi
          done

      - name: Promote canary to stable
        run: |
          cd terraform
          terraform init -no-color

          # Make the canary version the new stable version
          terraform apply -no-color -auto-approve \
            -var="stable_version=${{ github.event.inputs.canary_version }}" \
            -var="canary_enabled=false" \
            -var="canary_weight=0"

          echo "Canary promoted to stable"
```

## Automated Rollback

If the canary monitoring step fails, automatically roll back:

```yaml
  rollback-canary:
    needs: monitor-canary
    if: failure()  # Only runs if monitoring failed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Rollback canary
        run: |
          cd terraform
          terraform init -no-color

          # Remove the canary and send all traffic back to stable
          terraform apply -no-color -auto-approve \
            -var="canary_enabled=false" \
            -var="canary_weight=0"

          echo "Canary rolled back. All traffic on stable."

      - name: Notify team
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{
              "text": "Canary deployment of version ${{ github.event.inputs.canary_version }} was rolled back due to elevated error rates."
            }'
```

## CloudWatch Alarms for Canary Monitoring

```hcl
# canary-monitoring.tf
resource "aws_cloudwatch_metric_alarm" "canary_errors" {
  count = var.canary_enabled ? 1 : 0

  alarm_name          = "canary-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Canary is generating too many 5xx errors"

  dimensions = {
    TargetGroup  = aws_lb_target_group.canary[0].arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Summary

Canary deployments with Terraform CI/CD provide a safer path to production than all-at-once releases. The gradual traffic shift gives you time to detect issues before they affect all users. The key components are weighted target groups for traffic distribution, automated health monitoring during the canary phase, and instant rollback when metrics degrade. Combined with CI/CD pipeline orchestration, you get a deployment process that catches problems early and minimizes blast radius.

For an alternative deployment pattern, see our guide on [implementing blue-green deployments with Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-blue-green-deployments-with-terraform-cicd/view).
