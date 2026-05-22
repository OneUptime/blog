# How to Implement Infrastructure Cost Optimization Strategy with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Optimization, FinOps, Cloud Cost, DevOps

Description: Learn how to implement infrastructure cost optimization strategies using Terraform, including right-sizing, reserved capacity, spot instances, resource scheduling, and automated cost governance.

---

Cloud costs grow silently. An oversized instance here, a forgotten test environment there, and suddenly your monthly bill is double what it should be. Terraform is uniquely positioned to help with cost optimization because it gives you visibility into and control over every resource in your infrastructure. By embedding cost-awareness into your Terraform workflows, you can keep cloud spending aligned with business value.

In this guide, we will cover strategies for using Terraform to optimize infrastructure costs.

## Right-Sizing Resources

The most impactful cost optimization is using the right size for each resource:

```hcl
# cost-optimization/right-sizing.tf

# Environment-aware resource sizing

variable "environment" {
  type = string
}

locals {
  # Define appropriate sizes for each environment
  sizing = {
    dev = {
      instance_type    = "t3.small"
      db_instance      = "db.t3.medium"
      cache_node_type  = "cache.t3.small"
      desired_count    = 1
      multi_az         = false
    }
    staging = {
      instance_type    = "t3.medium"
      db_instance      = "db.r6g.large"
      cache_node_type  = "cache.r6g.large"
      desired_count    = 2
      multi_az         = false
    }
    production = {
      instance_type    = "t3.large"
      db_instance      = "db.r6g.xlarge"
      cache_node_type  = "cache.r6g.xlarge"
      desired_count    = 3
      multi_az         = true
    }
  }

  config = local.sizing[var.environment]
}

resource "aws_instance" "app" {
  instance_type = local.config.instance_type
  # ... other configuration
}

resource "aws_db_instance" "main" {
  instance_class = local.config.db_instance
  multi_az       = local.config.multi_az
  # ... other configuration
}
```

Resource Scheduling for Non-Production

Stop non-production resources outside business hours:

```hcl
# cost-optimization/scheduling.tf
# Auto-stop dev and staging resources after hours

# Lambda function to stop/start resources on schedule
resource "aws_lambda_function" "resource_scheduler" {
  function_name = "resource-scheduler"
  runtime       = "python3.11"
  handler       = "scheduler.handler"
  role          = aws_iam_role.scheduler.arn
  timeout       = 300
  filename      = "scheduler.zip"
}

resource "aws_iam_role" "scheduler_target" {
  name = "resource-scheduler-target"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "scheduler.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "scheduler_invoke_lambda" {
  name = "invoke-resource-scheduler"
  role = aws_iam_role.scheduler_target.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = "lambda:InvokeFunction"
      Effect   = "Allow"
      Resource = aws_lambda_function.resource_scheduler.arn
    }]
  })
}

# Stop dev resources at 7 PM
resource "aws_scheduler_schedule" "stop_dev" {
  name                         = "stop-dev-resources"
  description                  = "Stop dev resources at 7 PM Eastern time"
  schedule_expression          = "cron(0 19 ? * MON-FRI *)"
  schedule_expression_timezone = "America/New_York"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.resource_scheduler.arn
    role_arn = aws_iam_role.scheduler_target.arn

    input = jsonencode({
      action      = "stop"
      environment = "dev"
    })
  }
}

# Start dev resources at 7 AM
resource "aws_scheduler_schedule" "start_dev" {
  name                         = "start-dev-resources"
  description                  = "Start dev resources at 7 AM Eastern time"
  schedule_expression          = "cron(0 7 ? * MON-FRI *)"
  schedule_expression_timezone = "America/New_York"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.resource_scheduler.arn
    role_arn = aws_iam_role.scheduler_target.arn

    input = jsonencode({
      action      = "start"
      environment = "dev"
    })
  }
}
```

## Spot Instances for Cost Savings

Use spot instances for fault-tolerant workloads:

```hcl
# cost-optimization/spot-instances.tf
# Mixed instance strategy with spot for cost savings

resource "aws_autoscaling_group" "app" {
  name             = "app-production"
  min_size         = 3
  max_size         = 20
  desired_capacity = 3

  mixed_instances_policy {
    instances_distribution {
      # 30% on-demand for baseline, 70% spot for savings
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 30
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      # Multiple instance types for better spot availability
      override {
        instance_type = "t3.large"
      }
      override {
        instance_type = "t3a.large"
      }
      override {
        instance_type = "m5.large"
      }
      override {
        instance_type = "m5a.large"
      }
    }
  }
}
```

## Cost Tagging Strategy

Implement tagging for cost allocation:

```hcl
# cost-optimization/tagging.tf
# Mandatory cost allocation tags

locals {
  cost_tags = {
    CostCenter  = var.cost_center
    Team        = var.team
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Enforce tagging through provider default tags
provider "aws" {
  region = var.region

  default_tags {
    tags = local.cost_tags
  }
}
```

## Automated Cost Estimation in CI/CD

Estimate costs before deploying:

```yaml
# .github/workflows/cost-estimation.yaml
name: Cost Estimation

on:
  pull_request:
    paths: ['infrastructure/**']

jobs:
  estimate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - name: Terraform Plan
        run: |
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > plan.json

      - name: Estimate Costs with Infracost
        run: |
          infracost breakdown --path plan.json \
            --format json --out-file cost.json

      - name: Post Cost Comment
        uses: actions/github-script@v7
        with:
          script: |
            const cost = require('./cost.json');
            const monthly = cost.totalMonthlyCost;
            const diff = cost.diffTotalMonthlyCost;

            const body = `## Cost Estimation

            | Metric | Value |
            |--------|-------|
            | Monthly Cost | $${monthly} |
            | Cost Change | $${diff} |

            *Powered by Infracost*`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body
            });
```

## Best Practices

Right-size from the start. It is easier to prevent over-provisioning than to right-size after the fact.

Tag everything for cost visibility. Without proper tags, you cannot allocate costs to teams or projects.

Automate cost guardrails. Set budget alerts and policy checks that prevent expensive resources from being created without approval.

Review costs regularly. Monthly cost reviews help catch waste early before it accumulates.

Use reserved capacity for predictable workloads. Reserved instances and savings plans provide 30-60% savings over on-demand pricing.

## Conclusion

Infrastructure cost optimization with Terraform is about making cost-awareness a natural part of your infrastructure workflow. By right-sizing resources per environment, scheduling non-production resources, using spot instances, and estimating costs in CI/CD, you create a culture where cost efficiency is built into every infrastructure decision. The result is cloud spending that delivers maximum business value.
