# How to Create a Complete Production-Ready Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Production, Infrastructure as Code, AWS, DevOps

Description: Learn how to build a complete production-ready infrastructure with Terraform, including networking, compute, databases, monitoring, security, and CI/CD pipelines that meet enterprise standards.

---

Building production-ready infrastructure with Terraform means going beyond simply provisioning resources. It means creating an environment that is secure, observable, resilient, and maintainable. Production infrastructure needs encryption, redundancy, monitoring, backup, access controls, and disaster recovery capabilities.

In this guide, we will build a complete production-ready infrastructure stack from the ground up.

## Architecture Overview

Our production infrastructure includes networking with multi-AZ redundancy, an ECS Fargate compute layer, an RDS PostgreSQL database with Multi-AZ failover, an Application Load Balancer with HTTPS, CloudWatch monitoring and alerting, IAM roles with least privilege, and encryption everywhere.

## Networking Layer

```hcl
# production/networking.tf
# Production networking with multi-AZ redundancy

module "vpc" {
  source = "../modules/networking"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
  project     = var.project_name

  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  # Production needs NAT gateways in every AZ
  single_nat_gateway = false
  one_nat_gateway_per_az = true

  # Enable VPC flow logs for security auditing
  enable_flow_logs = true
}
```

## Compute Layer with ECS Fargate

```hcl
# production/compute.tf
# ECS Fargate service for production workloads

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-production"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${var.ecr_repository_url}:${var.app_version}"
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "ENVIRONMENT", value = "production" },
        { name = "DB_HOST", value = aws_db_instance.main.address },
      ]
      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "app"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets         = module.vpc.private_subnet_ids
    security_groups = [aws_security_group.app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Auto-scaling
resource "aws_appautoscaling_target" "app" {
  max_capacity       = 20
  min_capacity       = 3
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.project_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.app.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70
  }
}
```

## Database Layer

```hcl
# production/database.tf
# Production RDS with Multi-AZ and encryption

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-production"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.database.arn

  db_name  = var.db_name
  username = var.db_username
  password = data.aws_secretsmanager_secret_version.db_password.secret_string

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-production-final"

  performance_insights_enabled    = true
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql"]

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-production-db"
    Backup      = "daily"
    DataClass   = "sensitive"
  }
}
```

## Load Balancer with HTTPS

```hcl
# production/alb.tf
# Application Load Balancer with HTTPS and security headers

resource "aws_lb" "main" {
  name               = "${var.project_name}-production"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnet_ids

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    enabled = true
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Redirect HTTP to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

## Monitoring and Alerting

```hcl
# production/monitoring.tf
# Comprehensive monitoring for production

resource "aws_cloudwatch_metric_alarm" "service_cpu" {
  alarm_name          = "${var.project_name}-production-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Service CPU is above 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
}

resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "${var.project_name}-production-db-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database CPU is above 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project_name}-production-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "More than 10 5xx errors in 5 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}
```

## Best Practices

Enable encryption on every resource that supports it. Use KMS for key management and rotate keys automatically.

Use Multi-AZ for all stateful resources. Databases, caches, and message queues should all be deployed across multiple availability zones.

Implement deletion protection on critical resources. Production databases, load balancers, and S3 buckets should have deletion protection enabled.

Monitor everything from day one. Set up alerts for CPU, memory, disk, error rates, and latency before you need them.

Automate backups with sufficient retention. 30 days minimum for production databases.

Use secrets management for all credentials. Never hardcode passwords, API keys, or tokens in Terraform configuration.

## Conclusion

Production-ready infrastructure requires attention to security, reliability, observability, and operational excellence from the start. By building these concerns into your Terraform configuration rather than bolting them on later, you create infrastructure that is ready for real traffic from day one. The patterns shown here provide a solid foundation that can be extended as your application grows.
