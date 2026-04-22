# How to Implement Self-Healing Infrastructure with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Self-Healing, Reliability, AWS, Auto Scaling, Infrastructure as Code, Resilience

Description: Learn how to design self-healing infrastructure using OpenTofu that automatically detects and recovers from failures without manual intervention.

---

Self-healing infrastructure automatically detects failures and recovers from them - replacing unhealthy instances, rescheduling failed tasks, and restoring desired state. OpenTofu provisions the components that enable self-healing: health checks, Auto Scaling groups, and automated recovery mechanisms.

## EC2 Auto Recovery

AWS Auto Recovery recovers supported EC2 instances when system status checks fail, such as after underlying hardware or power issues.

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

resource "aws_instance" "critical_service" {
  ami                    = var.ami_id
  instance_type          = "m5.large"
  subnet_id              = var.private_subnet_id
  vpc_security_group_ids = [aws_security_group.app.id]

  tags = {
    Name = "critical-service"
  }
}

# CloudWatch alarm that triggers auto-recovery when status check fails
resource "aws_cloudwatch_metric_alarm" "instance_recovery" {
  alarm_name          = "instance-recovery-${aws_instance.critical_service.id}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed_System"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1

  # Trigger EC2 auto recovery action
  alarm_actions = [
    "arn:aws:automate:${var.aws_region}:ec2:recover"
  ]

  dimensions = {
    InstanceId = aws_instance.critical_service.id
  }
}
```

## Auto Scaling Group Health-Based Replacement

```hcl
# asg_healing.tf
resource "aws_autoscaling_group" "app" {
  name                = "${var.app_name}-asg"
  min_size            = 2
  max_size            = 10
  desired_capacity    = var.desired_count
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Use ELB health checks - more thorough than EC2 health checks
  health_check_type         = "ELB"
  health_check_grace_period = 300  # Give instances 5 min to start

  # Automatically replace instances that fail health checks
  # (This happens by default with ELB health check type)

  target_group_arns = [aws_lb_target_group.app.arn]

  # During scale-in, terminate the oldest instances before using the default policy
  termination_policies = ["OldestInstance", "Default"]
}
```

## ECS Service Auto-Recovery

```hcl
# ecs_healing.tf
resource "aws_ecs_service" "app" {
  name            = var.app_name
  cluster         = var.ecs_cluster_arn
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  # ECS automatically replaces unhealthy tasks
  health_check_grace_period_seconds = 120

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.app_name
    container_port   = 8080
  }

  # Enable circuit breaker - stop rollouts that keep failing
  deployment_circuit_breaker {
    enable   = true
    rollback = true  # Automatically rollback failed deployments
  }

  # Use the ECS rolling deployment controller required by the circuit breaker
  deployment_controller {
    type = "ECS"
  }
}
```

## Automated RDS Instance Recovery

```hcl
# rds_healing.tf
resource "aws_db_instance" "app" {
  identifier             = "${var.app_name}-db"
  engine                 = "postgres"
  engine_version         = "15.17"
  instance_class         = "db.t3.medium"
  allocated_storage      = 50
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # Multi-AZ provides automatic failover
  multi_az = true

  # Enable automated backups for point-in-time recovery
  backup_retention_period = 7
  backup_window           = "03:00-04:00"

  # Enable enhanced monitoring for health visibility
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Auto minor version upgrades for security patches
  auto_minor_version_upgrade = true
  maintenance_window         = "sun:04:00-sun:05:00"
}

# CloudWatch alarm to flag a possible outage during failover
resource "aws_cloudwatch_metric_alarm" "rds_failover" {
  alarm_name          = "${var.app_name}-rds-failover"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Minimum"
  threshold           = 0
  treat_missing_data  = "breaching"

  alarm_description = "RDS connection count dropped to zero - possible failover or outage"
  alarm_actions     = [var.alert_sns_topic_arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.app.id
  }
}
```

## Best Practices

- Use ELB health checks (not EC2 health checks) for ASG groups - they verify application availability, not just instance reachability.
- Set appropriate health check grace periods - too short and healthy instances get terminated during startup.
- Enable deployment circuit breakers on ECS services to stop failed rollouts and automatically roll back when new task definitions keep failing.
- Pair self-healing with alerting - automatic recovery is great, but your team should still know when healing events occur.
- Test recovery regularly using Chaos Engineering tools (AWS FIS, chaos-mesh) to verify your healing mechanisms work as expected.
