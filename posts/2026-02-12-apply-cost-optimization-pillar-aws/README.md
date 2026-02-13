# How to Apply the Cost Optimization Pillar on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Well-Architected, Cost Optimization, FinOps

Description: Practical strategies for implementing the Cost Optimization pillar of the AWS Well-Architected Framework, covering right-sizing, savings plans, spot instances, and cost governance.

---

The Cost Optimization pillar isn't about spending less - it's about spending smarter. Running lean on AWS doesn't mean cutting corners on reliability or performance. It means eliminating waste, choosing the right pricing models, and making cost a first-class concern in your architecture decisions. Most organizations are overspending on AWS by 30-40%, and the fixes are often straightforward once you know where to look.

Let's go through the practical strategies for optimizing costs on AWS.

## Design Principles

The Cost Optimization pillar has five design principles:

1. Implement cloud financial management
2. Adopt a consumption model
3. Measure overall efficiency
4. Stop spending money on undifferentiated heavy lifting
5. Analyze and attribute expenditure

## Cloud Financial Management

Someone needs to own cloud costs. This isn't just a finance problem or an engineering problem - it's both.

**Set up AWS Budgets to catch cost spikes early:**

```hcl
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-total-budget"
  budget_type  = "COST"
  limit_amount = "10000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["platform-team@company.com"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["platform-team@company.com", "finance@company.com"]
  }
}

# Per-service budgets for visibility
resource "aws_budgets_budget" "ec2" {
  name         = "ec2-budget"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["platform-team@company.com"]
  }
}
```

**Enable Cost Allocation Tags** so you can attribute costs to teams, projects, and environments:

```hcl
resource "aws_ce_cost_allocation_tag" "environment" {
  tag_key = "Environment"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "team" {
  tag_key = "Team"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "project" {
  tag_key = "Project"
  status  = "Active"
}
```

For details on setting up consistent tagging, check out our guide on [managing AWS tagging standards with Terraform](https://oneuptime.com/blog/post/2026-02-12-manage-aws-tagging-standards-terraform-default-tags/view).

## Right-Sizing

The most common waste on AWS is oversized resources. Most EC2 instances run at under 20% CPU utilization.

**Use Compute Optimizer data to inform instance selection:**

```hcl
# Start with smaller instances and scale out instead of up
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2
  vpc_zone_identifier = var.private_subnet_ids

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "price-capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      # Use multiple instance types for spot availability
      override {
        instance_type = "m7g.large"
      }
      override {
        instance_type = "m6g.large"
      }
      override {
        instance_type = "c7g.large"
      }
      override {
        instance_type = "c6g.large"
      }
    }
  }

  tag {
    key                 = "Name"
    value               = "app-instance"
    propagate_at_launch = true
  }
}
```

This configuration uses spot instances for 90%+ of capacity with multiple instance types for better availability. One on-demand instance ensures you always have baseline capacity.

## Pricing Models

### Savings Plans

Savings Plans provide up to 72% discount in exchange for a commitment to a consistent amount of usage:

```hcl
# While you can't create Savings Plans directly with Terraform,
# you can use Cost Explorer data to inform your commitment.

# Monitor your on-demand spend to determine the right commitment level
resource "aws_ce_anomaly_monitor" "service_monitor" {
  name              = "ServiceMonitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "alerts" {
  name      = "cost-anomaly-alerts"
  frequency = "DAILY"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.service_monitor.arn,
  ]

  subscriber {
    type    = "EMAIL"
    address = "platform-team@company.com"
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }
}
```

The anomaly detection catches unexpected cost spikes, which could indicate a misconfiguration, a runaway process, or a pricing change.

### Spot Instances

Spot instances offer up to 90% discount for interruptible workloads:

```hcl
# Spot Fleet for batch processing
resource "aws_spot_fleet_request" "batch" {
  iam_fleet_role  = aws_iam_role.spot_fleet.arn
  target_capacity = 10

  allocation_strategy = "priceCapacityOptimized"

  launch_specification {
    instance_type = "c6g.2xlarge"
    ami           = var.ami_id
    subnet_id     = var.private_subnet_ids[0]

    tags = {
      Name = "batch-spot"
    }
  }

  launch_specification {
    instance_type = "c6g.xlarge"
    ami           = var.ami_id
    subnet_id     = var.private_subnet_ids[0]

    tags = {
      Name = "batch-spot"
    }
  }

  # Handle interruptions gracefully
  terminate_instances_with_expiration = true
  excess_capacity_termination_policy  = "Default"
}
```

### Reserved Capacity for Databases

For databases that run 24/7, reserved instances still make sense:

```hcl
# RDS with reserved instance pricing in mind
resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r6g.xlarge"  # match your RI reservation

  # Use Aurora Serverless v2 for variable workloads instead
  # It scales automatically and can be cheaper than a fixed-size instance
}
```

## Eliminating Waste

### Schedule Non-Production Resources

Development and staging environments don't need to run 24/7:

```hcl
# Lambda function to stop/start dev instances on a schedule
resource "aws_scheduler_schedule" "stop_dev" {
  name       = "stop-dev-instances"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = "cron(0 19 ? * MON-FRI *)"  # 7 PM weekdays
  schedule_expression_timezone = "America/New_York"

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:stopInstances"
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      InstanceIds = var.dev_instance_ids
    })
  }
}

resource "aws_scheduler_schedule" "start_dev" {
  name       = "start-dev-instances"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = "cron(0 7 ? * MON-FRI *)"  # 7 AM weekdays
  schedule_expression_timezone = "America/New_York"

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:startInstances"
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      InstanceIds = var.dev_instance_ids
    })
  }
}
```

This alone can cut development environment costs by 65%.

### Clean Up Unused Resources

Unattached EBS volumes, unused Elastic IPs, idle load balancers, and old snapshots all cost money:

```hcl
# S3 lifecycle rules to clean up old data
resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }

  rule {
    id     = "clean-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

### Use Serverless Where Appropriate

Serverless services charge per use, meaning zero cost when idle:

```hcl
# DynamoDB on-demand - pay per request instead of provisioned capacity
resource "aws_dynamodb_table" "app" {
  name         = "app-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

# Fargate instead of EC2 for containers
resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.main.id
  launch_type     = "FARGATE"
  desired_count   = 2
  task_definition = aws_ecs_task_definition.app.arn

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.app.id]
  }
}
```

## Data Transfer Costs

Data transfer is the hidden cost killer on AWS. A few strategies to reduce it:

- Use VPC endpoints for S3 and DynamoDB (free for gateway endpoints)
- Keep compute and storage in the same region
- Use CloudFront for frequently accessed content
- Compress data before transfer
- Use S3 Transfer Acceleration for cross-region uploads

## Summary

Cost optimization is an ongoing process, not a one-time exercise. The three biggest levers are: right-sizing (stop paying for capacity you don't use), pricing models (Savings Plans and Spot for predictable and interruptible workloads), and waste elimination (schedule non-production, clean up unused resources, use serverless). Set up budgets and anomaly detection so cost surprises are caught early, and make cost visibility available to the teams that control spending.

For monitoring your infrastructure alongside costs, check out our post on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view).
