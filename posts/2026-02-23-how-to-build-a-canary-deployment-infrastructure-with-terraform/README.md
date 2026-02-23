# How to Build a Canary Deployment Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Canary Deployment, Progressive Delivery, AWS, CodeDeploy

Description: Learn how to build canary deployment infrastructure with Terraform using weighted target groups, automated traffic shifting, health monitoring, and automatic rollback.

---

Canary deployments take the idea of progressive delivery and apply it methodically. Instead of switching all traffic to a new version at once, you send a small percentage first - the canary - and watch it carefully. If the canary is healthy, you gradually increase traffic. If it shows problems, you roll back before most users are affected. It is the best balance between deployment speed and safety.

## Why Canary Deployments?

Blue-green gives you instant switching but no gradual validation. Rolling updates spread changes across instances but cannot easily roll back. Canary deployments give you the best of both worlds: gradual rollout with instant rollback capability. You get real production validation with real user traffic while limiting the blast radius of any issues.

## Architecture Overview

Our canary deployment setup includes:

- ALB with weighted target groups for traffic splitting
- CodeDeploy for automated canary orchestration
- CloudWatch alarms for canary health monitoring
- Automatic rollback on alarm triggers
- Lambda for custom metric evaluation
- Step Functions for deployment orchestration

## Weighted Target Groups

The foundation of canary deployments is traffic splitting at the load balancer level.

```hcl
# Application Load Balancer
resource "aws_lb" "app" {
  name               = "app-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  tags = {
    Environment = var.environment
  }
}

# Stable (production) target group
resource "aws_lb_target_group" "stable" {
  name                 = "app-stable-${var.environment}"
  port                 = 8080
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  deregistration_delay = 120

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
    matcher             = "200"
  }

  tags = {
    Role = "stable"
  }
}

# Canary target group
resource "aws_lb_target_group" "canary" {
  name                 = "app-canary-${var.environment}"
  port                 = 8080
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  deregistration_delay = 60

  health_check {
    enabled             = true
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 2  # Faster failure detection for canary
    timeout             = 3
    interval            = 5   # More frequent checks for canary
    matcher             = "200"
  }

  tags = {
    Role = "canary"
  }
}

# HTTPS Listener with weighted routing
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app.arn

  default_action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.stable.arn
        weight = var.stable_weight  # Start at 100
      }

      target_group {
        arn    = aws_lb_target_group.canary.arn
        weight = var.canary_weight  # Start at 0
      }

      stickiness {
        enabled  = true
        duration = 600
      }
    }
  }
}
```

## CodeDeploy for Automated Canary Orchestration

AWS CodeDeploy can automate the gradual traffic shifting.

```hcl
# CodeDeploy application
resource "aws_codedeploy_app" "app" {
  name             = "app-${var.environment}"
  compute_platform = "ECS"  # Or "Server" for EC2
}

# Canary deployment group with automatic traffic shifting
resource "aws_codedeploy_deployment_group" "canary" {
  app_name               = aws_codedeploy_app.app.name
  deployment_group_name  = "canary-deployment"
  deployment_config_name = aws_codedeploy_deployment_config.canary.id
  service_role_arn       = aws_iam_role.codedeploy.arn

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  alarm_configuration {
    alarms  = [
      aws_cloudwatch_metric_alarm.canary_5xx.alarm_name,
      aws_cloudwatch_metric_alarm.canary_latency.alarm_name,
      aws_cloudwatch_metric_alarm.canary_error_rate.alarm_name,
    ]
    enabled = true
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 60
    }
  }

  ecs_service {
    cluster_name = aws_ecs_cluster.main.name
    service_name = aws_ecs_service.app.name
  }

  load_balancer_info {
    target_group_pair_info {
      prod_traffic_route {
        listener_arns = [aws_lb_listener.https.arn]
      }

      target_group {
        name = aws_lb_target_group.stable.name
      }

      target_group {
        name = aws_lb_target_group.canary.name
      }
    }
  }
}

# Custom canary deployment configuration
resource "aws_codedeploy_deployment_config" "canary" {
  deployment_config_name = "canary-5-then-100"
  compute_platform       = "ECS"

  traffic_routing_config {
    type = "TimeBasedCanary"

    time_based_canary {
      interval   = 10  # minutes between steps
      percentage = 5   # start with 5% of traffic
    }
  }
}

# Alternative: Linear deployment (gradual increase)
resource "aws_codedeploy_deployment_config" "linear" {
  deployment_config_name = "linear-10-percent"
  compute_platform       = "ECS"

  traffic_routing_config {
    type = "TimeBasedLinear"

    time_based_linear {
      interval   = 5   # minutes between steps
      percentage = 10  # increase by 10% each step
    }
  }
}
```

## ECS Service for Canary Deployments

Using ECS with CodeDeploy gives you container-level canary control.

```hcl
# ECS cluster
resource "aws_ecs_cluster" "main" {
  name = "app-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECS task definition
resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "app"
    image = "${var.ecr_repository_url}:${var.app_version}"
    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval    = 10
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "app"
      }
    }
    environment = [
      { name = "ENVIRONMENT", value = var.environment },
      { name = "VERSION", value = var.app_version },
    ]
  }])
}

# ECS service with deployment controller for CodeDeploy
resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  deployment_controller {
    type = "CODE_DEPLOY"
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.stable.arn
    container_name   = "app"
    container_port   = 8080
  }

  lifecycle {
    ignore_changes = [
      task_definition,
      load_balancer,
      desired_count,
    ]
  }
}
```

## Canary Health Monitoring

The key to safe canary deployments is comprehensive monitoring with automatic rollback.

```hcl
# Canary 5XX error alarm - triggers rollback
resource "aws_cloudwatch_metric_alarm" "canary_5xx" {
  alarm_name          = "canary-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Canary target group is returning 5xx errors"
  alarm_actions       = [aws_sns_topic.deployment.arn]

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
    TargetGroup  = aws_lb_target_group.canary.arn_suffix
  }
}

# Canary latency alarm
resource "aws_cloudwatch_metric_alarm" "canary_latency" {
  alarm_name          = "canary-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 2  # 2 seconds
  alarm_description   = "Canary p99 latency is too high"
  alarm_actions       = [aws_sns_topic.deployment.arn]

  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
    TargetGroup  = aws_lb_target_group.canary.arn_suffix
  }
}

# Custom error rate alarm (percentage-based)
resource "aws_cloudwatch_metric_alarm" "canary_error_rate" {
  alarm_name          = "canary-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 1  # 1% error rate

  metric_query {
    id          = "error_rate"
    expression  = "(errors / total) * 100"
    label       = "Error Rate %"
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
        LoadBalancer = aws_lb.app.arn_suffix
        TargetGroup  = aws_lb_target_group.canary.arn_suffix
      }
    }
  }

  metric_query {
    id = "total"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.app.arn_suffix
        TargetGroup  = aws_lb_target_group.canary.arn_suffix
      }
    }
  }

  alarm_actions = [aws_sns_topic.deployment.arn]
}
```

## Custom Canary Analysis Lambda

For more sophisticated canary analysis beyond simple thresholds.

```hcl
# Lambda for custom canary analysis
resource "aws_lambda_function" "canary_analyzer" {
  filename         = "canary_analyzer.zip"
  function_name    = "canary-health-analyzer"
  role             = aws_iam_role.canary_analyzer.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 120

  environment {
    variables = {
      STABLE_TG_ARN  = aws_lb_target_group.stable.arn_suffix
      CANARY_TG_ARN  = aws_lb_target_group.canary.arn_suffix
      ALB_ARN        = aws_lb.app.arn_suffix
      SNS_TOPIC_ARN  = aws_sns_topic.deployment.arn
      # Compare canary metrics against stable baseline
      MAX_ERROR_RATIO   = "2.0"   # Canary errors must be < 2x stable
      MAX_LATENCY_RATIO = "1.5"   # Canary latency must be < 1.5x stable
    }
  }
}

# Run canary analysis every minute during deployment
resource "aws_cloudwatch_event_rule" "canary_analysis" {
  name                = "canary-analysis-schedule"
  schedule_expression = "rate(1 minute)"
  is_enabled          = false  # Enable during deployments
}

resource "aws_cloudwatch_event_target" "canary_analysis" {
  rule      = aws_cloudwatch_event_rule.canary_analysis.name
  target_id = "analyze-canary"
  arn       = aws_lambda_function.canary_analyzer.arn
}

resource "aws_sns_topic" "deployment" {
  name = "canary-deployment-alerts"
}
```

## Wrapping Up

Canary deployments provide the safest path to production. By sending just a small percentage of traffic to the new version and comparing its metrics against the stable baseline, you catch problems before they affect most users. Automatic rollback on alarm triggers means human reaction time is not a factor.

The combination of CodeDeploy for orchestration, CloudWatch alarms for health monitoring, and weighted target groups for traffic splitting gives you a fully automated canary pipeline. Deploy with confidence, watch the metrics, and let the system roll back if anything looks wrong.

For monitoring your canary deployments with real-time comparison between stable and canary metrics, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-canary-deployment-infrastructure-with-terraform/view) for progressive delivery observability.
