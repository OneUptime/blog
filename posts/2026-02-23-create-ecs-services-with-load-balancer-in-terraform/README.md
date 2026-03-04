# How to Create ECS Services with Load Balancer in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ECS, ALB, Load Balancer, Fargate, Containers

Description: How to create ECS Fargate services with Application Load Balancer integration in Terraform, covering target groups, health checks, HTTPS listeners, and blue-green deployments.

---

An ECS service keeps your containers running and connects them to a load balancer. Without a service, you would need to manually start tasks and wire up networking. The service handles task placement, rolling updates, health monitoring, and load balancer registration automatically. When a container fails a health check, the service replaces it. When you push a new image, the service rolls out the update gradually.

This guide covers creating an ECS service with an Application Load Balancer in Terraform. We will build the ALB, target groups, listeners, the service itself, and the deployment configuration that controls how updates roll out.

## The Application Load Balancer

Start with the ALB and its supporting resources:

```hcl
# Application Load Balancer
resource "aws_lb" "main" {
  name               = "myapp-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true

  tags = {
    Name = "myapp-alb"
  }
}

# ALB security group
resource "aws_security_group" "alb" {
  name_prefix = "alb-"
  vpc_id      = var.vpc_id
  description = "Security group for the Application Load Balancer"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "alb-sg"
  }
}
```

## Target Group

The target group tells the ALB where to send traffic. For Fargate, the target type must be `ip`:

```hcl
# Target group for the ECS service
resource "aws_lb_target_group" "app" {
  name        = "myapp-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"  # Required for Fargate

  # Health check configuration
  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200"
  }

  # Deregistration delay - how long to wait before removing a task
  deregistration_delay = 30

  # Stickiness - optional, for session-based apps
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = false
  }

  tags = {
    Name = "myapp-tg"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Listeners

Set up HTTPS with a redirect from HTTP:

```hcl
# HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  tags = {
    Name = "https-listener"
  }
}

# HTTP listener - redirect to HTTPS
resource "aws_lb_listener" "http" {
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

  tags = {
    Name = "http-redirect"
  }
}
```

## The ECS Service

Now the service that ties everything together:

```hcl
# ECS Service
resource "aws_ecs_service" "app" {
  name            = "myapp"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  # Network configuration (required for Fargate)
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_service.id]
    assign_public_ip = false
  }

  # Load balancer configuration
  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"       # Must match container name in task definition
    container_port   = 8080        # Must match container port
  }

  # Deployment configuration
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  # These settings mean:
  # - Always keep at least 100% of desired tasks running
  # - Allow up to 200% during deployment (for rolling updates)

  # Circuit breaker - automatically roll back failed deployments
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Health check grace period - time to wait before checking health
  health_check_grace_period_seconds = 120

  # Enable ECS Exec for debugging
  enable_execute_command = true

  # Force new deployment when task definition changes
  force_new_deployment = true

  # Ensure the ALB listener exists before creating the service
  depends_on = [aws_lb_listener.https]

  tags = {
    Name = "myapp-service"
  }

  # Ignore changes to desired_count if using auto scaling
  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Security group for ECS tasks
resource "aws_security_group" "ecs_service" {
  name_prefix = "ecs-service-"
  vpc_id      = var.vpc_id
  description = "Security group for myapp ECS tasks"

  # Only allow traffic from the ALB
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "From ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "ecs-service-sg"
  }
}
```

## Multiple Services Behind One ALB

You can run multiple services behind the same ALB using path-based or host-based routing:

```hcl
# Target group for the API service
resource "aws_lb_target_group" "api" {
  name        = "api-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path    = "/api/health"
    matcher = "200"
  }
}

# Target group for the frontend service
resource "aws_lb_target_group" "frontend" {
  name        = "frontend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path    = "/"
    matcher = "200"
  }
}

# Listener rules for path-based routing
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "frontend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}

# API service
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs_service.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.https]
}

# Frontend service
resource "aws_ecs_service" "frontend" {
  name            = "frontend"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs_service.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.https]
}
```

## Monitoring the Service

```hcl
# Alarm when the service has unhealthy targets
resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "myapp-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "ECS service has unhealthy targets"

  dimensions = {
    TargetGroup  = aws_lb_target_group.app.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [var.sns_topic_arn]
}

# Alarm for high response time
resource "aws_cloudwatch_metric_alarm" "response_time" {
  alarm_name          = "myapp-response-time-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 2  # 2 seconds
  alarm_description   = "Average response time is above 2 seconds"

  dimensions = {
    TargetGroup  = aws_lb_target_group.app.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [var.sns_topic_arn]
}
```

## Outputs

```hcl
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID for Route53 alias records"
  value       = aws_lb.main.zone_id
}

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.app.name
}

output "target_group_arn" {
  description = "Target group ARN"
  value       = aws_lb_target_group.app.arn
}
```

## Summary

An ECS service with a load balancer in Terraform requires the ALB, target group (with `target_type = "ip"` for Fargate), listeners, the service with `load_balancer` block, and matching security groups. The deployment circuit breaker automatically rolls back failed deployments, and `health_check_grace_period_seconds` prevents false positives during startup. Use path-based or host-based routing to run multiple services behind a single ALB. Set `lifecycle { ignore_changes = [desired_count] }` if you plan to use auto scaling, which we cover in our guide on [configuring ECS auto scaling](https://oneuptime.com/blog/post/2026-02-23-configure-ecs-auto-scaling-in-terraform/view).
