# How to Apply the Reliability Pillar on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Well-Architected, Reliability, High Availability, Disaster Recovery

Description: How to implement the Reliability pillar of the AWS Well-Architected Framework with practical patterns for fault tolerance, auto-recovery, and disaster recovery on AWS.

---

The Reliability pillar is about making sure your workload does what it's supposed to do, when it's supposed to do it, even when things go wrong. And things will go wrong - servers fail, networks partition, services throttle, regions have outages. The question isn't whether you'll face failures, but whether your system survives them gracefully.

AWS gives you the building blocks for highly reliable systems. Let's look at how to put them together.

## Design Principles

The Reliability pillar has five design principles:

1. Automatically recover from failure
2. Test recovery procedures
3. Scale horizontally to increase aggregate workload availability
4. Stop guessing capacity
5. Manage change through automation

## Foundations: Quotas and Networking

Before you can build reliable systems, you need solid foundations. That starts with understanding service quotas and networking.

**Service Quotas** - Know your limits and request increases proactively:

```hcl
# Monitor service quota usage
resource "aws_cloudwatch_metric_alarm" "ec2_instance_limit" {
  alarm_name          = "ec2-instance-limit-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 80  # alert at 80% usage

  metric_query {
    id          = "usage_percentage"
    expression  = "usage/limit*100"
    label       = "EC2 Instance Quota Usage %"
    return_data = true
  }

  metric_query {
    id = "usage"
    metric {
      metric_name = "ResourceCount"
      namespace   = "AWS/Usage"
      period      = 300
      stat        = "Maximum"
      dimensions = {
        Type     = "Resource"
        Resource = "vCPU"
        Service  = "EC2"
        Class    = "Standard/OnDemand"
      }
    }
  }

  metric_query {
    id = "limit"
    metric {
      metric_name = "ServiceLimit"
      namespace   = "AWS/Usage"
      period      = 300
      stat        = "Maximum"
      dimensions = {
        Type     = "Resource"
        Resource = "vCPU"
        Service  = "EC2"
        Class    = "Standard/OnDemand"
      }
    }
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

**Multi-AZ Networking** - Spread across availability zones from the start:

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# Subnets across three AZs
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${data.aws_availability_zones.available.names[count.index]}"
  }
}
```

## Auto-Recovery Patterns

Every component should be able to recover automatically.

**EC2 Auto Recovery** - CloudWatch alarms can automatically recover failed instances:

```hcl
resource "aws_cloudwatch_metric_alarm" "auto_recovery" {
  alarm_name          = "ec2-auto-recovery"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed_System"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0

  alarm_actions = [
    "arn:aws:automate:${var.region}:ec2:recover"
  ]

  dimensions = {
    InstanceId = aws_instance.critical.id
  }
}
```

**Auto Scaling Groups** - Replace unhealthy instances automatically:

```hcl
resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  desired_capacity    = 3
  min_size            = 2
  max_size            = 10
  vpc_zone_identifier = aws_subnet.private[*].id

  health_check_type         = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 90
    }
  }

  tag {
    key                 = "Name"
    value               = "app-instance"
    propagate_at_launch = true
  }
}

# Target tracking scaling
resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0
  }
}
```

## Database Reliability

Databases are often the hardest component to make reliable because they hold state.

**RDS Multi-AZ** - Automatic failover for relational databases:

```hcl
resource "aws_db_instance" "main" {
  identifier     = "app-database"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  multi_az               = true
  storage_encrypted      = true
  deletion_protection    = true

  backup_retention_period = 7
  backup_window           = "03:00-04:00"

  # Enable Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
}
```

**Read Replicas** - Offload read traffic and serve as failover targets:

```hcl
resource "aws_db_instance" "read_replica" {
  count               = 2
  identifier          = "app-database-replica-${count.index}"
  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = "db.r6g.large"

  # Place replicas in different AZs
  availability_zone = data.aws_availability_zones.available.names[count.index + 1]
}
```

**DynamoDB** - Built-in reliability with global tables for multi-region:

```hcl
resource "aws_dynamodb_table" "main" {
  name         = "app-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  # Multi-region replication
  replica {
    region_name = "eu-west-1"
  }

  replica {
    region_name = "ap-northeast-1"
  }
}
```

## Fault Isolation

Limit the blast radius of failures:

**Cell-Based Architecture** - Divide your workload into independent cells. Each cell serves a subset of users and fails independently.

**Bulkhead Pattern** - Isolate components so failure in one doesn't cascade:

```hcl
# Separate ECS services with their own scaling and health checks
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

resource "aws_ecs_service" "worker" {
  name            = "worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 2

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
```

The deployment circuit breaker automatically rolls back failed deployments, preventing bad code from taking down your service.

## Disaster Recovery Strategies

Choose your DR strategy based on RTO (Recovery Time Objective) and RPO (Recovery Point Objective):

1. **Backup and Restore** (hours RTO, hours RPO) - cheapest, slowest recovery
2. **Pilot Light** (minutes RTO, seconds RPO) - minimal infrastructure always running in DR region
3. **Warm Standby** (minutes RTO, seconds RPO) - scaled-down version running in DR region
4. **Active-Active** (near-zero RTO and RPO) - full capacity in multiple regions

For most applications, Pilot Light or Warm Standby provides a good balance of cost and recovery speed.

## Testing Reliability

**Backup Testing** - Regularly restore from backups to verify they work:

```hcl
# AWS Backup with a restore testing plan
resource "aws_backup_plan" "main" {
  name = "reliability-backup-plan"

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 * * ? *)"

    lifecycle {
      delete_after = 30
    }
  }
}
```

**Chaos Engineering** - Intentionally inject failures to find weaknesses before they find you. AWS Fault Injection Simulator (FIS) lets you do this safely:

```hcl
resource "aws_fis_experiment_template" "az_failure" {
  description = "Simulate AZ failure"
  role_arn    = aws_iam_role.fis.arn

  action {
    name      = "stop-instances"
    action_id = "aws:ec2:stop-instances"

    target {
      key   = "Instances"
      value = "az-instances"
    }
  }

  target {
    name           = "az-instances"
    resource_type  = "aws:ec2:instance"
    selection_mode = "ALL"

    resource_tag {
      key   = "availability-zone"
      value = "us-east-1a"
    }
  }

  stop_condition {
    source = "aws:cloudwatch:alarm"
    value  = aws_cloudwatch_metric_alarm.error_rate.arn
  }
}
```

The stop condition is critical - it automatically halts the experiment if your error rate exceeds the threshold, preventing the test from becoming an actual outage.

## Summary

Reliability on AWS is about building systems that expect failure and handle it gracefully. Use Multi-AZ deployments for high availability, auto-scaling for capacity management, and automated recovery for fault tolerance. Test everything - your backups, your failover, your scaling. And build monitoring so you know when something is degrading before it fails completely. For monitoring strategies, see our post on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view).
