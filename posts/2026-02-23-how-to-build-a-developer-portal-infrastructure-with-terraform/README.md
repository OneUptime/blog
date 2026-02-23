# How to Build a Developer Portal Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Developer Portal, Backstage, Platform Engineering, Infrastructure as Code

Description: Learn how to build developer portal infrastructure using Terraform with Backstage for service catalogs, documentation, and developer self-service tooling.

---

A developer portal is the front door to your platform. It gives developers a single place to discover services, read documentation, create new projects from templates, and manage their infrastructure. Backstage, originally created by Spotify, has become the most popular open-source framework for building developer portals.

In this guide, we will set up the complete infrastructure for a Backstage-based developer portal using Terraform, including the compute platform, database, authentication, and supporting services.

## What Goes Into a Developer Portal

A production-ready developer portal needs:

- A compute platform to run the Backstage application
- A PostgreSQL database for the catalog and user data
- Authentication via an identity provider
- Object storage for documentation and assets
- A CDN for serving the frontend
- CI/CD for updating the portal itself

## The Database Layer

Backstage uses PostgreSQL for its catalog and plugin data. We will set up an RDS instance with the right configuration.

```hcl
# database.tf - PostgreSQL for Backstage
resource "aws_db_subnet_group" "backstage" {
  name       = "backstage-db-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "Backstage Database Subnet Group"
  }
}

resource "aws_db_instance" "backstage" {
  identifier = "backstage-catalog"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"

  allocated_storage     = 50
  max_allocated_storage = 200
  storage_encrypted     = true

  db_name  = "backstage"
  username = "backstage"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.backstage.name
  vpc_security_group_ids = [aws_security_group.backstage_db.id]
  publicly_accessible    = false

  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "backstage-final-${formatdate("YYYY-MM-DD", timestamp())}"

  tags = {
    Application = "Backstage"
  }
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

# Store credentials in Secrets Manager
resource "aws_secretsmanager_secret" "backstage_db" {
  name = "backstage/database-credentials"
}

resource "aws_secretsmanager_secret_version" "backstage_db" {
  secret_id = aws_secretsmanager_secret.backstage_db.id
  secret_string = jsonencode({
    username = aws_db_instance.backstage.username
    password = random_password.db_password.result
    host     = aws_db_instance.backstage.address
    port     = aws_db_instance.backstage.port
    dbname   = aws_db_instance.backstage.db_name
  })
}
```

## ECS Fargate for Running Backstage

Backstage runs as a Node.js application. ECS Fargate is a good fit because it handles the container orchestration without needing to manage servers.

```hcl
# ecs.tf - Backstage on ECS Fargate
resource "aws_ecs_cluster" "backstage" {
  name = "backstage"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Application = "Backstage"
  }
}

resource "aws_ecs_task_definition" "backstage" {
  family                   = "backstage"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.backstage_execution.arn
  task_role_arn            = aws_iam_role.backstage_task.arn

  container_definitions = jsonencode([
    {
      name  = "backstage"
      image = "${aws_ecr_repository.backstage.repository_url}:${var.backstage_version}"

      portMappings = [
        {
          containerPort = 7007
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "APP_CONFIG_app_baseUrl"
          value = "https://${var.portal_domain}"
        },
        {
          name  = "APP_CONFIG_backend_baseUrl"
          value = "https://${var.portal_domain}"
        }
      ]

      secrets = [
        {
          name      = "POSTGRES_HOST"
          valueFrom = "${aws_secretsmanager_secret.backstage_db.arn}:host::"
        },
        {
          name      = "POSTGRES_PORT"
          valueFrom = "${aws_secretsmanager_secret.backstage_db.arn}:port::"
        },
        {
          name      = "POSTGRES_USER"
          valueFrom = "${aws_secretsmanager_secret.backstage_db.arn}:username::"
        },
        {
          name      = "POSTGRES_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.backstage_db.arn}:password::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backstage.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backstage"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:7007/healthcheck || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

resource "aws_ecs_service" "backstage" {
  name            = "backstage"
  cluster         = aws_ecs_cluster.backstage.id
  task_definition = aws_ecs_task_definition.backstage.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.backstage_app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backstage.arn
    container_name   = "backstage"
    container_port   = 7007
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
```

## Application Load Balancer

The ALB handles HTTPS termination and routes traffic to the Backstage containers.

```hcl
# alb.tf - Load balancer for Backstage
resource "aws_lb" "backstage" {
  name               = "backstage-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.backstage_alb.id]
  subnets            = var.public_subnet_ids

  tags = {
    Application = "Backstage"
  }
}

resource "aws_lb_target_group" "backstage" {
  name        = "backstage-tg"
  port        = 7007
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/healthcheck"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 10
    interval            = 30
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.backstage.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backstage.arn
  }
}

# Redirect HTTP to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.backstage.arn
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

# DNS record
resource "aws_route53_record" "backstage" {
  zone_id = var.route53_zone_id
  name    = var.portal_domain
  type    = "A"

  alias {
    name                   = aws_lb.backstage.dns_name
    zone_id                = aws_lb.backstage.zone_id
    evaluate_target_health = true
  }
}
```

## Authentication with Cognito

Backstage needs authentication. AWS Cognito provides OIDC-compatible authentication that integrates with corporate identity providers.

```hcl
# auth.tf - Cognito for Backstage authentication
resource "aws_cognito_user_pool" "backstage" {
  name = "backstage-users"

  # Password policy
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # MFA configuration
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = {
    Application = "Backstage"
  }
}

resource "aws_cognito_user_pool_client" "backstage" {
  name         = "backstage-app"
  user_pool_id = aws_cognito_user_pool.backstage.id

  generate_secret = true

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true

  callback_urls = [
    "https://${var.portal_domain}/api/auth/cognito/handler/frame"
  ]

  supported_identity_providers = ["COGNITO"]
}

resource "aws_cognito_user_pool_domain" "backstage" {
  domain       = "${var.project_name}-backstage"
  user_pool_id = aws_cognito_user_pool.backstage.id
}
```

## S3 for TechDocs

Backstage TechDocs generates static documentation from markdown files in your repositories. S3 stores the generated HTML.

```hcl
# techdocs.tf - S3 bucket for TechDocs
resource "aws_s3_bucket" "techdocs" {
  bucket = "${var.project_name}-backstage-techdocs"

  tags = {
    Application = "Backstage"
    Purpose     = "TechDocs"
  }
}

resource "aws_s3_bucket_public_access_block" "techdocs" {
  bucket = aws_s3_bucket.techdocs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "techdocs" {
  bucket = aws_s3_bucket.techdocs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# IAM policy for Backstage to read/write TechDocs
resource "aws_iam_role_policy" "backstage_techdocs" {
  name = "backstage-techdocs-access"
  role = aws_iam_role.backstage_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.techdocs.arn,
          "${aws_s3_bucket.techdocs.arn}/*"
        ]
      }
    ]
  })
}
```

## Security Groups

```hcl
# security.tf - Network security
resource "aws_security_group" "backstage_alb" {
  name_prefix = "backstage-alb-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "backstage_app" {
  name_prefix = "backstage-app-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 7007
    to_port         = 7007
    protocol        = "tcp"
    security_groups = [aws_security_group.backstage_alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "backstage_db" {
  name_prefix = "backstage-db-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backstage_app.id]
  }
}
```

## Summary

A developer portal built on Backstage provides a central hub where developers can discover services, read documentation, and provision infrastructure. By managing the infrastructure with Terraform, you get a reproducible, version-controlled setup that you can deploy across multiple environments.

The key components are the database (RDS), compute (ECS Fargate), authentication (Cognito), and storage (S3 for TechDocs). Each piece is isolated with proper security groups and encrypted at rest.

As your portal grows, you will add Backstage plugins for things like CI/CD integration, cost tracking, and incident management. For monitoring the health of your developer portal and the services listed in it, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) provides uptime monitoring and alerting that integrates well with a platform engineering setup.
