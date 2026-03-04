# How to Build Zero-Downtime Deployment Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Zero Downtime, Deployment, Auto Scaling, Rolling Updates

Description: A practical guide to building zero-downtime deployment infrastructure with Terraform using rolling updates, health checks, connection draining, and database migrations.

---

Downtime during deployments is unacceptable for most production applications. Users do not care that you are releasing a new feature - they just want the application to work. Building infrastructure that supports zero-downtime deployments requires careful planning around health checks, connection draining, rolling updates, and database migrations. Terraform can set all of this up as code so every environment gets the same deployment behavior.

## Why Zero-Downtime Matters

Every minute of downtime costs money and erodes trust. Even brief interruptions during deployment can cause failed transactions, broken user sessions, and lost data. Zero-downtime deployment means users never notice that a new version was released. The transition happens seamlessly behind the scenes.

## Architecture Overview

Our zero-downtime deployment infrastructure includes:

- Auto Scaling Groups with rolling update policies
- Application Load Balancer with health checks
- Connection draining for graceful termination
- Launch template versioning
- Database migration strategies
- Route53 health checks for DNS failover

## Launch Template with Versioning

Launch templates support versioning, which is key for rolling updates.

```hcl
# Launch template for the application
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    app_version    = var.app_version
    environment    = var.environment
    config_bucket  = aws_s3_bucket.config.id
  }))

  monitoring {
    enabled = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "app-${var.environment}"
      Version     = var.app_version
      Environment = var.environment
    }
  }

  # Create new version before destroying old one
  lifecycle {
    create_before_destroy = true
  }
}
```

## Application Load Balancer with Health Checks

The ALB determines when instances are ready to receive traffic.

```hcl
# Application Load Balancer
resource "aws_lb" "app" {
  name               = "app-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true
  enable_http2               = true

  tags = {
    Environment = var.environment
  }
}

# Target group with detailed health checks
resource "aws_lb_target_group" "app" {
  name                 = "app-${var.environment}"
  port                 = 8080
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "instance"
  deregistration_delay = 120  # 2 minutes for connection draining

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
    matcher             = "200"
  }

  # Slow start gives new instances time to warm up
  slow_start = 60

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 3600
    enabled         = true
  }

  tags = {
    Environment = var.environment
  }
}

# HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## Auto Scaling Group with Rolling Updates

The ASG handles the actual rolling deployment.

```hcl
# Auto Scaling Group with instance refresh for zero-downtime updates
resource "aws_autoscaling_group" "app" {
  name                = "app-${var.environment}"
  min_size            = var.min_instances
  max_size            = var.max_instances
  desired_capacity    = var.desired_instances
  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.app.arn]

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Health check configuration
  health_check_type         = "ELB"
  health_check_grace_period = 300  # 5 minutes for app startup
  wait_for_capacity_timeout = "10m"

  # Instance refresh for rolling deployments
  instance_refresh {
    strategy = "Rolling"

    preferences {
      # Replace 25% of instances at a time
      min_healthy_percentage = 75

      # Wait for new instances to pass health checks
      instance_warmup = 120

      # Skip replacing instances that are already running the latest version
      skip_matching = true

      # Auto rollback if too many instances fail
      auto_rollback = true
    }

    triggers = ["launch_template"]
  }

  # Termination policies
  termination_policies = ["OldestLaunchTemplate", "OldestInstance"]

  # Ensure new instances are healthy before terminating old ones
  default_instance_warmup = 120

  tag {
    key                 = "Name"
    value               = "app-${var.environment}"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Scaling policies
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

resource "aws_autoscaling_policy" "request_count" {
  name                   = "request-count-target"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.app.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }
    target_value = 1000.0
  }
}
```

## Database Migration Strategy

Zero-downtime deployments require backward-compatible database migrations.

```hcl
# RDS with read replicas for zero-downtime migrations
resource "aws_db_instance" "primary" {
  identifier     = "app-db-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"

  # Settings that support zero-downtime
  multi_az                    = true
  allow_major_version_upgrade = false
  auto_minor_version_upgrade  = true
  apply_immediately           = false  # Apply during maintenance window

  backup_retention_period = 35
  deletion_protection     = true
  storage_encrypted       = true

  # Performance insights for monitoring
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  tags = {
    Environment = var.environment
  }
}

# Read replica for reporting and during migrations
resource "aws_db_instance" "read_replica" {
  identifier          = "app-db-${var.environment}-replica"
  replicate_source_db = aws_db_instance.primary.identifier
  instance_class      = "db.r6g.large"

  auto_minor_version_upgrade = true
  multi_az                   = false

  tags = {
    Environment = var.environment
    Purpose     = "read-replica"
  }
}

# Lambda for running database migrations before deployment
resource "aws_lambda_function" "db_migrate" {
  filename         = "db_migrate.zip"
  function_name    = "db-migration-runner"
  role             = aws_iam_role.migration_lambda.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 300

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.migration.id]
  }

  environment {
    variables = {
      DB_HOST     = aws_db_instance.primary.address
      DB_NAME     = "app"
      DB_SECRET   = aws_secretsmanager_secret.db_credentials.id
    }
  }
}
```

## DNS Health Checks and Failover

Route53 health checks provide an additional safety net.

```hcl
# Route53 health check on the ALB
resource "aws_route53_health_check" "app" {
  fqdn              = "app.company.com"
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 3
  request_interval   = 10

  tags = {
    Name = "app-health-check"
  }
}

# DNS record with failover routing
resource "aws_route53_record" "app_primary" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.company.com"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }

  set_identifier = "primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.app.id
}

# Static maintenance page as failover
resource "aws_route53_record" "app_secondary" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.company.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.maintenance.domain_name
    zone_id                = aws_cloudfront_distribution.maintenance.hosted_zone_id
    evaluate_target_health = false
  }

  set_identifier = "secondary"

  failover_routing_policy {
    type = "SECONDARY"
  }
}
```

## Monitoring During Deployments

Track deployment progress and catch issues early.

```hcl
# CloudWatch alarm for error rate during deployment
resource "aws_cloudwatch_metric_alarm" "deployment_errors" {
  alarm_name          = "deployment-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "5XX errors exceeded threshold during deployment"
  alarm_actions       = [aws_sns_topic.deployment_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
    TargetGroup  = aws_lb_target_group.app.arn_suffix
  }
}

# Latency alarm
resource "aws_cloudwatch_metric_alarm" "deployment_latency" {
  alarm_name          = "deployment-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 5  # 5 seconds
  alarm_actions       = [aws_sns_topic.deployment_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }
}

resource "aws_sns_topic" "deployment_alerts" {
  name = "deployment-alerts-${var.environment}"
}
```

## Wrapping Up

Zero-downtime deployment infrastructure is about getting every piece right: health checks that accurately reflect application readiness, connection draining that lets in-flight requests complete, rolling updates that replace instances gradually, and database migrations that are backward compatible.

Terraform's `instance_refresh` feature with `auto_rollback` is particularly powerful. It handles the orchestration of replacing instances while maintaining minimum capacity, and it will roll back automatically if the new instances fail health checks.

For monitoring your deployments in real time and catching regressions immediately, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-zero-downtime-deployment-infrastructure-with-terraform/view) for deployment observability with automatic alerting.
