# How to Set Up ECS with Application Load Balancer Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, ALB, Load Balancer, HTTPS, Infrastructure as Code

Description: Learn how to deploy an ECS service with an Application Load Balancer using OpenTofu, including HTTPS listener, health checks, and security group configuration for production workloads.

## Introduction

Connecting ECS services to an Application Load Balancer enables high availability across multiple tasks and Availability Zones, HTTPS termination, path-based routing, and health check-based task replacement. The ALB communicates with ECS tasks via their private IP addresses using the `awsvpc` network mode.

## Prerequisites

- OpenTofu v1.6+
- An ECS cluster, VPC with public and private subnets, and an ACM certificate
- AWS credentials with ECS, ALB, and EC2 permissions

## Step 1: Create Application Load Balancer

```hcl
# ALB in public subnets

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true
  drop_invalid_header_fields = true  # Security best practice

  access_logs {
    bucket  = var.access_log_bucket
    prefix  = "${var.project_name}-alb"
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# ALB security group - accept HTTPS from internet
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Allow HTTPS traffic to ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from internet"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP for redirect"
  }

  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [var.ecs_tasks_security_group_id]
    description     = "Forward to ECS tasks"
  }
}
```

## Step 2: Create Target Group and Listeners

```hcl
# Target group for ECS tasks
resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-app-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"  # Required for ECS services using awsvpc network mode

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200"
  }

  deregistration_delay = 30  # Seconds to drain connections before deregistering

  tags = {
    Name = "${var.project_name}-app-tg"
  }
}

# HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# HTTP to HTTPS redirect
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
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

## Step 3: Path-Based Routing Rules

```hcl
# Forward /api/* to API service target group
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = var.api_target_group_arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Forward /admin/* to admin service with authentication
resource "aws_lb_listener_rule" "admin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type = "authenticate-cognito"
    authenticate_cognito {
      user_pool_arn       = var.cognito_pool_arn
      user_pool_client_id = var.cognito_client_id
      user_pool_domain    = var.cognito_domain
    }
  }

  action {
    type             = "forward"
    target_group_arn = var.admin_target_group_arn
  }

  condition {
    path_pattern {
      values = ["/admin/*"]
    }
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Get the ALB DNS name
aws elbv2 describe-load-balancers \
  --names my-project-alb \
  --query 'LoadBalancers[0].DNSName' --output text
```

## Conclusion

Set `deregistration_delay` to a value that covers your longest expected in-flight requests; 30-60 seconds is typical for many HTTP workloads, but increase it for long-lived uploads or streaming responses. The ALB performs health checks using the `health_check.path` endpoint. Ensure this endpoint responds quickly and reflects whether the task is ready to serve traffic. Use `ELBSecurityPolicy-TLS13-1-2-2021-06` to enforce TLS 1.3 while maintaining TLS 1.2 compatibility for older clients.
