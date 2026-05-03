# How to Deploy Keycloak with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Keycloak, Identity, SSO, Authentication

Description: Learn how to deploy Keycloak identity provider on AWS using OpenTofu with RDS backend, ECS deployment, and ALB configuration for production-ready SSO.

## Introduction

Keycloak is an open-source identity and access management solution providing SSO, OIDC, SAML, and user federation. This guide deploys Keycloak on AWS using ECS Fargate with an RDS PostgreSQL backend and ALB for HTTPS termination.

## Infrastructure Overview

```text
ALB (HTTPS) → ECS Fargate (Keycloak) → RDS PostgreSQL
```

## RDS PostgreSQL for Keycloak

```hcl
resource "aws_db_instance" "keycloak" {
  identifier              = "keycloak-${var.environment}"
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = "db.t3.medium"
  allocated_storage       = 20
  max_allocated_storage   = 100
  storage_type            = "gp3"
  storage_encrypted       = true

  db_name  = "keycloak"
  username = "keycloak"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "keycloak-final-${formatdate("YYYY-MM-DD", timestamp())}"

  tags = { Name = "keycloak-db-${var.environment}" }
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "/keycloak/${var.environment}/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}
```

## ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "keycloak" {
  family                   = "keycloak-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "keycloak"
    image = "quay.io/keycloak/keycloak:23.0"

    command = ["start", "--optimized"]

    environment = [
      { name = "KC_DB",                  value = "postgres" },
      { name = "KC_DB_URL_HOST",         value = aws_db_instance.keycloak.address },
      { name = "KC_DB_URL_DATABASE",     value = "keycloak" },
      { name = "KC_DB_USERNAME",         value = "keycloak" },
      { name = "KC_HOSTNAME",            value = var.keycloak_hostname },
      { name = "KC_HOSTNAME_STRICT",     value = "true" },
      { name = "KC_HTTP_ENABLED",        value = "true" },
      { name = "KC_PROXY",               value = "edge" },  # ALB handles TLS
      { name = "KC_HEALTH_ENABLED",      value = "true" },
      { name = "KC_METRICS_ENABLED",     value = "true" },
      { name = "KC_LOG_LEVEL",           value = "INFO" },
      { name = "KEYCLOAK_ADMIN",         value = "admin" },
    ]

    secrets = [
      {
        name      = "KC_DB_PASSWORD"
        valueFrom = aws_secretsmanager_secret.db_password.arn
      },
      {
        name      = "KEYCLOAK_ADMIN_PASSWORD"
        valueFrom = aws_secretsmanager_secret.admin_password.arn
      }
    ]

    portMappings = [{ containerPort = 8080, protocol = "tcp" }]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/health/ready || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 120
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/keycloak-${var.environment}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "keycloak"
      }
    }
  }])
}
```

## ECS Service and ALB

```hcl
resource "aws_ecs_service" "keycloak" {
  name            = "keycloak-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.keycloak.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.keycloak.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.keycloak.arn
    container_name   = "keycloak"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.https]
}

resource "aws_lb_listener_rule" "keycloak" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  condition {
    host_header {
      values = [var.keycloak_hostname]
    }
  }
}
```

## Managing Keycloak Configuration with the Keycloak Provider

```hcl
provider "keycloak" {
  client_id     = "admin-cli"
  username      = "admin"
  password      = var.keycloak_admin_password
  url           = "https://${var.keycloak_hostname}"
}

resource "keycloak_realm" "app" {
  realm        = "app"
  enabled      = true
  display_name = "My Application"

  login_theme   = "keycloak"
  access_token_lifespan = "5m"

  ssl_required    = "external"
  registration_allowed = false
}
```

## Conclusion

Deploying Keycloak with OpenTofu creates a production-ready identity provider with database persistence, high availability, and HTTPS termination. The Keycloak provider lets you continue managing realms, clients, and users as code after the infrastructure is deployed. Use `KC_PROXY=edge` when Keycloak sits behind a load balancer that handles TLS, and store credentials in Secrets Manager rather than environment variables.
