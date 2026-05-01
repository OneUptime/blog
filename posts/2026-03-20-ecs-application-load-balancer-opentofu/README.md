# How to Deploy ECS with an Application Load Balancer Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ECS, ALB, Load Balancer, Terraform, Container, Infrastructure as Code

Description: Learn how to deploy an Amazon ECS Fargate service behind an Application Load Balancer using OpenTofu, including target groups, health checks, and HTTPS listeners.

---

Running ECS containers behind an Application Load Balancer (ALB) provides high availability, SSL termination, and path-based routing. This guide covers the complete OpenTofu configuration for ECS Fargate + ALB.

---

## Architecture

```text
Internet → ALB (port 443) → Target Group → ECS Fargate Tasks
                              (health checks)
```

---

## VPC and Networking

```hcl
# network.tf

data "aws_vpc" "main" {
  tags = { Name = "main" }
}

data "aws_region" "current" {}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "tag:Tier"
    values = ["public"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}
```

---

## Security Groups

```hcl
# security_groups.tf
resource "aws_security_group" "alb" {
  name   = "alb-sg"
  vpc_id = data.aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs_tasks" {
  name   = "ecs-tasks-sg"
  vpc_id = data.aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## Application Load Balancer

```hcl
# alb.tf
data "aws_acm_certificate" "main" {
  domain      = "app.example.com"
  statuses    = ["ISSUED"]
  most_recent = true
}

resource "aws_lb" "main" {
  name               = "app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.public.ids

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

resource "aws_lb_target_group" "app" {
  name        = "app-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.main.id
  target_type = "ip"  # Required for Fargate

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

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

---

## ECS Cluster and Task Definition

```hcl
# ecs.tf
data "aws_iam_role" "ecs_execution" {
  name = "ecsTaskExecutionRole"
}

data "aws_ecr_repository" "app" {
  name = "app"
}

resource "aws_cloudwatch_log_group" "app" {
  name = "/ecs/app"
}

resource "aws_ecs_cluster" "main" {
  name = "app-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = data.aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${data.aws_ecr_repository.app.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}
```

---

## ECS Service

```hcl
resource "aws_ecs_service" "app" {
  name            = "app-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.https]
}
```

---

## Outputs

```hcl
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}
```

---

## Best Practices

1. **Use target_type = "ip"** for Fargate - tasks don't have EC2 instance IDs
2. **Configure health checks** before deploying - tasks that fail the load balancer health check will be stopped and replaced
3. **Use HTTPS with ACM certificates** - the certificate must be in the same Region as the ALB
4. **Deploy tasks to private subnets** - only the ALB needs public access, but the tasks still need outbound access through a NAT gateway or the required VPC endpoints
5. **Enable Container Insights** on ECS clusters for CloudWatch metrics

---

## Conclusion

OpenTofu makes ECS + ALB deployments reproducible and version-controlled. Define your load balancer, target groups, listeners, and ECS service as code, and deploy with `tofu apply`.

---

*Monitor your ECS services and ALB health with [OneUptime](https://oneuptime.com) - synthetic monitoring with uptime checks.*
