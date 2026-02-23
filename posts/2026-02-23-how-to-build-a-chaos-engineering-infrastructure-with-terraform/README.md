# How to Build a Chaos Engineering Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Chaos Engineering, AWS FIS, Resilience, Testing, Infrastructure as Code

Description: Learn how to build chaos engineering infrastructure using Terraform with AWS Fault Injection Simulator for testing system resilience and failure recovery.

---

Chaos engineering is the practice of deliberately injecting failures into your systems to discover weaknesses before they cause real incidents. The idea is simple: if you want to be confident your system can handle failures, you should practice failing regularly in a controlled way.

In this guide, we will build the infrastructure for chaos engineering on AWS using Terraform. We will use AWS Fault Injection Simulator (FIS) to create repeatable experiments that test our system's resilience to various failure scenarios.

## Chaos Engineering Infrastructure

Our setup includes:

- **AWS FIS**: Experiment templates for different failure scenarios
- **IAM roles**: Controlled permissions for fault injection
- **CloudWatch**: Monitoring and stop conditions for safety
- **S3**: Experiment results and logs
- **SNS**: Notifications when experiments run

## Safety First: Stop Conditions

Before creating any experiments, set up stop conditions. These automatically halt an experiment if it causes too much damage.

```hcl
# safety.tf - Stop conditions and guardrails
# CloudWatch alarm that stops experiments if error rate spikes
resource "aws_cloudwatch_metric_alarm" "chaos_stop_condition" {
  alarm_name          = "chaos-engineering-stop-condition"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = var.error_rate_stop_threshold
  alarm_description   = "Stop chaos experiment - error rate too high"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = {
    Purpose = "ChaosEngineering"
    Type    = "StopCondition"
  }
}

# Stop condition based on latency
resource "aws_cloudwatch_metric_alarm" "latency_stop_condition" {
  alarm_name          = "chaos-latency-stop-condition"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "p99"
  threshold           = var.latency_stop_threshold_seconds
  alarm_description   = "Stop chaos experiment - latency too high"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  tags = {
    Purpose = "ChaosEngineering"
    Type    = "StopCondition"
  }
}

# SNS topic for chaos experiment notifications
resource "aws_sns_topic" "chaos_notifications" {
  name = "chaos-engineering-notifications"

  tags = {
    Purpose = "ChaosEngineering"
  }
}

resource "aws_sns_topic_subscription" "chaos_email" {
  for_each = toset(var.chaos_notification_emails)

  topic_arn = aws_sns_topic.chaos_notifications.arn
  protocol  = "email"
  endpoint  = each.value
}
```

## IAM Role for FIS

The FIS role defines exactly what actions chaos experiments can take. Keep this tightly scoped.

```hcl
# iam.tf - FIS execution role
resource "aws_iam_role" "fis" {
  name = "chaos-engineering-fis-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "fis.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Purpose = "ChaosEngineering"
  }
}

resource "aws_iam_role_policy" "fis" {
  name = "fis-experiment-policy"
  role = aws_iam_role.fis.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # EC2 actions for instance experiments
        Effect = "Allow"
        Action = [
          "ec2:StopInstances",
          "ec2:StartInstances",
          "ec2:TerminateInstances",
          "ec2:DescribeInstances"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ec2:ResourceTag/ChaosEnabled" = "true"
          }
        }
      },
      {
        # ECS actions for container experiments
        Effect = "Allow"
        Action = [
          "ecs:DescribeClusters",
          "ecs:ListTasks",
          "ecs:StopTask",
          "ecs:DescribeTasks"
        ]
        Resource = "*"
      },
      {
        # RDS actions for database experiments
        Effect = "Allow"
        Action = [
          "rds:FailoverDBCluster",
          "rds:RebootDBInstance",
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "rds:db-tag/ChaosEnabled" = "true"
          }
        }
      },
      {
        # CloudWatch for monitoring
        Effect = "Allow"
        Action = [
          "cloudwatch:DescribeAlarms"
        ]
        Resource = "*"
      },
      {
        # Logging
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "s3:PutObject"
        ]
        Resource = [
          "${aws_s3_bucket.chaos_logs.arn}/*"
        ]
      }
    ]
  })
}
```

## FIS Experiment Templates

Each template defines a specific failure scenario. Let's create several common experiments.

```hcl
# experiments.tf - FIS experiment templates

# Experiment 1: Kill random ECS tasks
resource "aws_fis_experiment_template" "ecs_task_kill" {
  description = "Stop random ECS tasks to test service resilience"
  role_arn    = aws_iam_role.fis.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = aws_cloudwatch_metric_alarm.chaos_stop_condition.arn
  }

  action {
    name      = "stop-tasks"
    action_id = "aws:ecs:stop-task"

    parameter {
      key   = "duration"
      value = "PT5M"
    }

    target {
      key   = "Tasks"
      value = "ecs-tasks"
    }
  }

  target {
    name           = "ecs-tasks"
    resource_type  = "aws:ecs:task"
    selection_mode = "COUNT(2)"

    resource_tag {
      key   = "ChaosEnabled"
      value = "true"
    }
  }

  log_configuration {
    s3_configuration {
      bucket_name = aws_s3_bucket.chaos_logs.id
      prefix      = "experiments/ecs-task-kill/"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "ecs-task-kill"
    Experiment = "resilience"
  }
}

# Experiment 2: EC2 instance stop
resource "aws_fis_experiment_template" "ec2_stop" {
  description = "Stop EC2 instances to test failover"
  role_arn    = aws_iam_role.fis.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = aws_cloudwatch_metric_alarm.chaos_stop_condition.arn
  }

  action {
    name      = "stop-instances"
    action_id = "aws:ec2:stop-instances"

    parameter {
      key   = "startInstancesAfterDuration"
      value = "PT10M"
    }

    target {
      key   = "Instances"
      value = "ec2-instances"
    }
  }

  target {
    name           = "ec2-instances"
    resource_type  = "aws:ec2:instance"
    selection_mode = "COUNT(1)"

    resource_tag {
      key   = "ChaosEnabled"
      value = "true"
    }

    filter {
      path   = "State.Name"
      values = ["running"]
    }
  }

  log_configuration {
    s3_configuration {
      bucket_name = aws_s3_bucket.chaos_logs.id
      prefix      = "experiments/ec2-stop/"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "ec2-instance-stop"
    Experiment = "failover"
  }
}

# Experiment 3: RDS failover
resource "aws_fis_experiment_template" "rds_failover" {
  description = "Trigger RDS failover to test database resilience"
  role_arn    = aws_iam_role.fis.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = aws_cloudwatch_metric_alarm.latency_stop_condition.arn
  }

  action {
    name      = "failover-db"
    action_id = "aws:rds:failover-db-cluster"

    target {
      key   = "Clusters"
      value = "rds-clusters"
    }
  }

  target {
    name           = "rds-clusters"
    resource_type  = "aws:rds:cluster"
    selection_mode = "ALL"

    resource_tag {
      key   = "ChaosEnabled"
      value = "true"
    }
  }

  log_configuration {
    s3_configuration {
      bucket_name = aws_s3_bucket.chaos_logs.id
      prefix      = "experiments/rds-failover/"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "rds-failover"
    Experiment = "database-resilience"
  }
}

# Experiment 4: Network disruption via NACL
resource "aws_fis_experiment_template" "network_disruption" {
  description = "Disrupt network connectivity to test network resilience"
  role_arn    = aws_iam_role.fis.arn

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = aws_cloudwatch_metric_alarm.chaos_stop_condition.arn
  }

  action {
    name      = "disrupt-network"
    action_id = "aws:network:disrupt-connectivity"

    parameter {
      key   = "duration"
      value = "PT3M"
    }

    parameter {
      key   = "scope"
      value = "all"
    }

    target {
      key   = "Subnets"
      value = "target-subnets"
    }
  }

  target {
    name           = "target-subnets"
    resource_type  = "aws:ec2:subnet"
    selection_mode = "COUNT(1)"

    resource_tag {
      key   = "ChaosEnabled"
      value = "true"
    }
  }

  log_configuration {
    s3_configuration {
      bucket_name = aws_s3_bucket.chaos_logs.id
      prefix      = "experiments/network-disruption/"
    }
    log_schema_version = 2
  }

  tags = {
    Name       = "network-disruption"
    Experiment = "network-resilience"
  }
}
```

## Experiment Logging and Results

Store experiment results for post-mortem analysis.

```hcl
# logging.tf - Experiment results storage
resource "aws_s3_bucket" "chaos_logs" {
  bucket = "${var.project_name}-chaos-engineering-logs"

  tags = {
    Purpose = "ChaosEngineering"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "chaos_logs" {
  bucket = aws_s3_bucket.chaos_logs.id

  rule {
    id     = "archive-old-experiments"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 365
    }
  }
}
```

## Scheduled Experiments

Run chaos experiments on a regular schedule to continuously validate resilience.

```hcl
# schedule.tf - Automated chaos experiments
resource "aws_scheduler_schedule" "weekly_ecs_chaos" {
  name       = "weekly-ecs-chaos-experiment"
  group_name = "chaos-engineering"

  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 60
  }

  # Run every Wednesday at 2 PM UTC during business hours
  schedule_expression = "cron(0 14 ? * WED *)"

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:fis:startExperiment"
    role_arn = aws_iam_role.chaos_scheduler.arn

    input = jsonencode({
      ExperimentTemplateId = aws_fis_experiment_template.ecs_task_kill.id
    })
  }
}
```

## Summary

Chaos engineering infrastructure built with Terraform makes failure testing repeatable and safe. The stop conditions are the most important part; they ensure experiments automatically halt if the system degrades beyond acceptable thresholds.

Start with simple experiments like killing a single ECS task, and gradually increase the scope as your confidence grows. The goal is not to break things; it is to learn how your system responds to failure and fix the weaknesses you discover.

For monitoring your systems during chaos experiments and tracking the impact of injected faults, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) provides real-time visibility into service health and can serve as both an observer during experiments and a stop condition trigger.
