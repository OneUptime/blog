# How to Deploy Portainer with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Portainer, Docker, Container Management, Self-Hosted

Description: Learn how to deploy Portainer container management UI on AWS using OpenTofu with ECS Fargate, EFS persistent storage, and ALB for managing Docker environments.

## Introduction

Portainer provides a web-based UI for managing Docker, Kubernetes, and Docker Swarm environments. This guide deploys Portainer Community Edition (CE) on AWS ECS Fargate with EFS for persistent data and ALB for HTTPS access.

## EFS for Portainer Data

```hcl
resource "aws_efs_file_system" "portainer" {
  creation_token  = "portainer-${var.environment}"
  encrypted       = true
  kms_key_id      = aws_kms_key.efs.arn
  throughput_mode = "elastic"

  tags = { Name = "portainer-data-${var.environment}" }
}

resource "aws_efs_mount_target" "portainer" {
  for_each        = toset(var.private_subnet_ids)
  file_system_id  = aws_efs_file_system.portainer.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "portainer" {
  file_system_id = aws_efs_file_system.portainer.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/portainer"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }
}
```

## ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "portainer" {
  family                   = "portainer-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  volume {
    name = "portainer-data"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.portainer.id
      transit_encryption = "ENABLED"
      root_directory     = "/"

      authorization_config {
        access_point_id = aws_efs_access_point.portainer.id
      }
    }
  }

  container_definitions = jsonencode([{
    name  = "portainer"
    image = "portainer/portainer-ce:latest"

    command = [
      "--http-disabled"
    ]

    portMappings = [
      { containerPort = 9443, protocol = "tcp", name = "https" },
      { containerPort = 8000, protocol = "tcp", name = "edge" },  # Edge agent tunnel
    ]

    mountPoints = [{
      sourceVolume  = "portainer-data"
      containerPath = "/data"
      readOnly      = false
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/portainer-${var.environment}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "portainer"
      }
    }
  }])
}
```

## ALB with HTTPS

```hcl
resource "aws_lb_target_group" "portainer" {
  name        = "portainer-${var.environment}"
  port        = 9443
  protocol    = "HTTPS"  # Portainer serves HTTPS directly
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    protocol            = "HTTPS"
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    matcher             = "200,302"
  }
}

resource "aws_lb_listener" "portainer_https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.portainer.arn
  }
}
```

## Initial Admin Setup

Portainer creates the first admin user on initial access. After the ALB and Route53 record are live, open `https://portainer.${var.domain_name}` and complete the setup flow, or initialize the account through the `POST /api/users/admin/init` API endpoint.

## Route53 Record

```hcl
resource "aws_route53_record" "portainer" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "portainer.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

## Conclusion

Deploying Portainer with OpenTofu provides a centralized management interface for Docker and Kubernetes environments. EFS ensures Portainer's configuration, user accounts, and environment connections persist across task replacements. For managing multiple remote Docker environments, configure the Portainer Edge Agent on remote hosts and connect them via the Edge tunnel port (8000). Disable HTTP access (`--http-disabled`) in production, enforce HTTPS-only connections, and complete the initial admin setup after the service becomes reachable.
