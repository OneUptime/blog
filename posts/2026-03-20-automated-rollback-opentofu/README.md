# How to Set Up Automated Rollback Strategies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Rollback, Reliability, CI/CD, Infrastructure as Code, Automation, Deployment

Description: Learn how to implement automated rollback strategies using OpenTofu that detect deployment failures and restore previous infrastructure state without manual intervention.

---

Automated rollbacks minimize the impact of failed deployments by detecting failures quickly and restoring the previous known-good state. With OpenTofu, rollback is either a `tofu apply` of the previous configuration or a targeted reversion of specific resources.

## State-Based Rollback

The simplest rollback strategy uses version-controlled infrastructure configurations.

```bash
# Rollback by reverting the Git commit and re-applying

git revert --no-edit HEAD
git push origin main
# CI/CD pipeline runs tofu apply on the reverted config automatically
```

## Lambda Alias Traffic Shifting with Rollback

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "new_version" {
  type        = string
  description = "New Lambda function version to deploy"
}

variable "canary_percentage" {
  type        = number
  description = "Percentage of traffic to route to new version (0 = rollback)"
  default     = 0

  validation {
    condition     = var.canary_percentage >= 0 && var.canary_percentage <= 100
    error_message = "canary_percentage must be between 0 and 100"
  }
}

resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.app.function_name
  function_version = var.stable_version  # The last known-good version

  # Route some traffic to new version during deployment
  routing_config {
    additional_version_weights = var.canary_percentage > 0 ? {
      (var.new_version) = var.canary_percentage / 100.0
    } : {}
  }
}
```

## ECS Service with Automatic Rollback

```hcl
# ecs_rollback.tf
resource "aws_ecs_service" "app" {
  name            = var.service_name
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  # Circuit breaker automatically rolls back failed deployments
  deployment_circuit_breaker {
    enable   = true
    rollback = true  # Automatically rollback to the last successful task definition
  }

  deployment_controller {
    type = "ECS"
  }

  # Rolling update capacity settings during deployment
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
}
```

## CloudWatch Alarm-Triggered Rollback

```hcl
# alarm_rollback.tf
# Lambda function that performs rollback when an alarm fires
resource "aws_lambda_function" "rollback_handler" {
  function_name = "infrastructure-rollback-handler"
  filename      = data.archive_file.rollback.output_path
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.rollback.arn
  timeout       = 300

  environment {
    variables = {
      # The GitHub repo and workflow file to dispatch for rollback
      GITHUB_OWNER      = var.github_org
      GITHUB_REPO       = var.github_repo
      GITHUB_TOKEN      = var.github_token
      ROLLBACK_WORKFLOW = "rollback.yml"
    }
  }
}

# SNS topic that the alarm notifies
resource "aws_sns_topic" "deployment_failures" {
  name = "deployment-failures"
}

resource "aws_sns_topic_subscription" "rollback_trigger" {
  topic_arn = aws_sns_topic.deployment_failures.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.rollback_handler.arn
}

# Permission for SNS to invoke Lambda
resource "aws_lambda_permission" "sns_rollback" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rollback_handler.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.deployment_failures.arn
}

# Alarm that triggers rollback on high target 5xx count
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.service_name}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 50  # More than 50 target 5xx responses per minute

  alarm_actions = [aws_sns_topic.deployment_failures.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}
```

## GitHub Actions Rollback Workflow

```yaml
# .github/workflows/rollback.yml
name: Emergency Rollback
on:
  workflow_dispatch:  # Triggered by the rollback Lambda via the GitHub REST API
    inputs:
      target_commit:
        description: 'Git commit SHA to roll back to'
        required: true

jobs:
  rollback:
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ inputs.target_commit }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ secrets.AWS_APPLY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: Rollback to previous state
        run: |
          tofu init
          tofu apply -auto-approve
        working-directory: infrastructure
```

## Best Practices

- Use ECS circuit breaker for application-layer rollbacks - it's automatic and doesn't require CI/CD pipeline involvement.
- Keep the last 3-5 infrastructure state snapshots to enable point-in-time recovery.
- Define rollback SLOs - for production incidents, rollback should complete within 5 minutes.
- Test rollback procedures regularly - an untested rollback procedure will fail at the worst possible time.
- Document which resources can be rolled back automatically vs which require manual intervention.
