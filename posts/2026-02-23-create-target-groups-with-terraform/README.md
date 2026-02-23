# How to Create Target Groups with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Target Groups, ALB, NLB, Load Balancing

Description: A complete guide to creating and configuring AWS target groups in Terraform for ALB and NLB, covering instance, IP, and Lambda targets with health checks and stickiness.

---

Target groups are the bridge between your load balancer and your backend resources. They define where traffic goes, how health is checked, and how connections are managed. Whether you're running EC2 instances, containers in ECS, Lambda functions, or IP-based targets, you need target groups to tie everything together.

This guide covers all the target group types and configurations available in Terraform.

## Target Group Types

AWS supports three target types, each suited to different architectures:

- **instance** - Routes to EC2 instances by instance ID. The ALB uses the instance's primary private IP.
- **ip** - Routes to specific IP addresses. Works with containers, cross-VPC targets, or on-premises resources via Direct Connect.
- **lambda** - Routes to Lambda functions. Only supported with ALBs.

## Instance Target Group

The most common type. Register EC2 instances and the ALB routes traffic to them.

```hcl
# Instance-based target group for a web application
resource "aws_lb_target_group" "web" {
  name_prefix = "web-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  # Health check configuration
  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  # Time to drain connections on deregistration
  deregistration_delay = 60

  # Gradually ramp up traffic to new targets
  slow_start = 120

  tags = {
    Name = "web-target-group"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Register specific instances
resource "aws_lb_target_group_attachment" "web_1" {
  target_group_arn = aws_lb_target_group.web.arn
  target_id        = aws_instance.web_1.id
  port             = 8080
}

resource "aws_lb_target_group_attachment" "web_2" {
  target_group_arn = aws_lb_target_group.web.arn
  target_id        = aws_instance.web_2.id
  port             = 8080
}
```

When using Auto Scaling Groups, you don't need `aws_lb_target_group_attachment` resources. Instead, reference the target group in the ASG:

```hcl
resource "aws_autoscaling_group" "web" {
  # ... other config ...

  # ASG handles registration and deregistration automatically
  target_group_arns = [aws_lb_target_group.web.arn]
}
```

## IP Target Group

Use IP targets for ECS tasks with awsvpc networking, cross-VPC resources, or external IP addresses.

```hcl
# IP-based target group for ECS Fargate tasks
resource "aws_lb_target_group" "api" {
  name_prefix = "api-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }

  deregistration_delay = 30  # Fargate tasks stop quickly

  tags = {
    Name = "api-target-group"
  }
}

# Register specific IPs (useful for non-ECS targets)
resource "aws_lb_target_group_attachment" "api_target" {
  target_group_arn  = aws_lb_target_group.api.arn
  target_id         = "10.0.1.100"
  port              = 8080
  availability_zone = "all"  # Required for cross-AZ IP targets
}
```

For ECS services, the service handles target registration:

```hcl
resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.api.id]
  }

  # ECS registers task IPs with the target group
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }
}
```

## Lambda Target Group

Route ALB requests directly to Lambda functions.

```hcl
# Lambda target group
resource "aws_lb_target_group" "lambda" {
  name_prefix = "lambda-"
  target_type = "lambda"

  # Lambda target groups don't need port, protocol, or vpc_id

  health_check {
    enabled             = true
    path                = "/health"
    matcher             = "200"
    interval            = 35
    timeout             = 30
    healthy_threshold   = 5
    unhealthy_threshold = 3
  }

  tags = {
    Name = "lambda-target-group"
  }
}

# Grant ALB permission to invoke the Lambda
resource "aws_lambda_permission" "alb" {
  statement_id  = "AllowExecutionFromALB"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "elasticloadbalancing.amazonaws.com"
  source_arn    = aws_lb_target_group.lambda.arn
}

# Register the Lambda function
resource "aws_lb_target_group_attachment" "lambda" {
  target_group_arn = aws_lb_target_group.lambda.arn
  target_id        = aws_lambda_function.api.arn

  depends_on = [aws_lambda_permission.alb]
}
```

## Session Stickiness

Sticky sessions ensure a user's requests consistently go to the same target.

```hcl
# Application-based stickiness (recommended)
resource "aws_lb_target_group" "sticky_app" {
  name_prefix = "sticky-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  stickiness {
    type            = "app_cookie"
    cookie_name     = "APPSESSIONID"  # Your application's session cookie
    cookie_duration = 86400           # 1 day in seconds
    enabled         = true
  }

  health_check {
    path    = "/health"
    matcher = "200"
  }
}

# ALB-generated cookie stickiness
resource "aws_lb_target_group" "sticky_lb" {
  name_prefix = "stkylb-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 3600  # 1 hour
    enabled         = true
  }

  health_check {
    path    = "/health"
    matcher = "200"
  }
}
```

Application-based stickiness is better because it uses your existing session mechanism rather than introducing another cookie.

## NLB Target Groups

Network Load Balancer target groups use TCP, UDP, or TLS protocols.

```hcl
# TCP target group for NLB
resource "aws_lb_target_group" "tcp" {
  name_prefix = "tcp-"
  port        = 8080
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  # TCP health check
  health_check {
    enabled             = true
    protocol            = "TCP"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }

  # Preserve client IP for NLB targets
  preserve_client_ip = true

  # Connection termination on deregistration
  connection_termination = true

  # Source IP stickiness for NLB
  stickiness {
    enabled = true
    type    = "source_ip"
  }

  tags = {
    Name = "tcp-target-group"
  }
}

# TLS target group
resource "aws_lb_target_group" "tls" {
  name_prefix = "tls-"
  port        = 443
  protocol    = "TLS"
  vpc_id      = aws_vpc.main.id

  health_check {
    protocol            = "TCP"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }
}

# UDP target group
resource "aws_lb_target_group" "udp" {
  name_prefix = "udp-"
  port        = 5000
  protocol    = "UDP"
  vpc_id      = aws_vpc.main.id

  health_check {
    protocol            = "TCP"   # UDP targets need TCP or HTTP health checks
    port                = 8080    # Check a TCP port on the target
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }
}
```

## Multiple Target Groups for Blue/Green

Create target groups for blue/green deployment patterns.

```hcl
# Blue target group (current production)
resource "aws_lb_target_group" "blue" {
  name     = "app-blue"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name  = "app-blue"
    Color = "blue"
  }
}

# Green target group (new version)
resource "aws_lb_target_group" "green" {
  name     = "app-green"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name  = "app-green"
    Color = "green"
  }
}

# Listener rule with weighted routing between blue and green
resource "aws_lb_listener_rule" "blue_green" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.blue.arn
        weight = var.blue_weight  # Default 100
      }
      target_group {
        arn    = aws_lb_target_group.green.arn
        weight = var.green_weight  # Default 0
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

## Dynamic Target Groups with for_each

```hcl
locals {
  services = {
    api = {
      port         = 8080
      health_path  = "/api/health"
      protocol     = "HTTP"
    }
    auth = {
      port         = 8081
      health_path  = "/auth/health"
      protocol     = "HTTP"
    }
    search = {
      port         = 9200
      health_path  = "/_cluster/health"
      protocol     = "HTTP"
    }
  }
}

resource "aws_lb_target_group" "services" {
  for_each = local.services

  name_prefix = "${each.key}-"
  port        = each.value.port
  protocol    = each.value.protocol
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    path                = each.value.health_path
    port                = "traffic-port"
    protocol            = each.value.protocol
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  deregistration_delay = 60

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name    = "${each.key}-tg"
    Service = each.key
  }
}
```

## Summary

Target groups tie your load balancer to your backends. Instance targets work best with EC2 and Auto Scaling. IP targets suit containers and cross-VPC architectures. Lambda targets let you build serverless APIs behind an ALB. For every target group, invest time in getting the health check right - it determines how quickly your load balancer detects and recovers from failures. And use `create_before_destroy` to prevent downtime during target group updates.

For more on load balancing, see our guides on [configuring ALB health checks](https://oneuptime.com/blog/post/2026-02-23-configure-alb-health-checks-in-terraform/view) and [creating ALB listener rules](https://oneuptime.com/blog/post/2026-02-23-create-alb-listener-rules-with-terraform/view).
