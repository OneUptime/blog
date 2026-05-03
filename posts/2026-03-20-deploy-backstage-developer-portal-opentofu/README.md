# How to Deploy Backstage Developer Portal with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Backstage, Developer Portal, Internal Developer Platform, IdP

Description: Learn how to deploy Spotify's Backstage developer portal on AWS using OpenTofu with RDS PostgreSQL, ECS Fargate, and GitHub integration for an internal developer platform.

## Introduction

Backstage is an open-source developer portal that consolidates service catalogs, documentation, scaffolding, and tooling into a unified internal developer platform. This guide deploys Backstage on AWS ECS Fargate with RDS PostgreSQL for catalog storage.

## RDS PostgreSQL for Backstage

```hcl
resource "aws_db_instance" "backstage" {
  identifier          = "backstage-${var.environment}"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.t3.medium"
  allocated_storage   = 50
  storage_encrypted   = true

  db_name  = "backstage"
  username = "backstage"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  deletion_protection     = true
}
```

## Secrets for GitHub and Auth Integration

```hcl
resource "aws_secretsmanager_secret" "backstage_secrets" {
  name = "/backstage/${var.environment}/app-secrets"
}

resource "aws_secretsmanager_secret_version" "backstage_secrets" {
  secret_id = aws_secretsmanager_secret.backstage_secrets.id
  secret_string = jsonencode({
    GITHUB_TOKEN              = var.github_token
    GITHUB_CLIENT_ID          = var.github_oauth_client_id
    GITHUB_CLIENT_SECRET      = var.github_oauth_client_secret
    POSTGRES_PASSWORD         = random_password.db_password.result
  })
}
```

## ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "backstage" {
  family                   = "backstage-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.backstage_task.arn

  container_definitions = jsonencode([{
    name  = "backstage"
    image = "${var.ecr_repository_url}:${var.app_version}"

    environment = [
      { name = "NODE_ENV",          value = "production" },
      { name = "APP_CONFIG_app_baseUrl",
        value = "https://${var.backstage_hostname}" },
      { name = "APP_CONFIG_backend_baseUrl",
        value = "https://${var.backstage_hostname}" },
      { name = "APP_CONFIG_backend_database_client", value = "pg" },
      { name = "APP_CONFIG_backend_database_connection_host",
        value = aws_db_instance.backstage.address },
      { name = "APP_CONFIG_backend_database_connection_port", value = "5432" },
      { name = "APP_CONFIG_backend_database_connection_database", value = "backstage" },
      { name = "APP_CONFIG_backend_database_connection_user", value = "backstage" },
    ]

    # Individual secret references from Secrets Manager
    secrets = [
      { name = "APP_CONFIG_backend_database_connection_password",
        valueFrom = "${aws_secretsmanager_secret.backstage_secrets.arn}:POSTGRES_PASSWORD::" },
      { name = "APP_CONFIG_auth_providers_github_development_clientId",
        valueFrom = "${aws_secretsmanager_secret.backstage_secrets.arn}:GITHUB_CLIENT_ID::" },
      { name = "APP_CONFIG_auth_providers_github_development_clientSecret",
        valueFrom = "${aws_secretsmanager_secret.backstage_secrets.arn}:GITHUB_CLIENT_SECRET::" },
      { name = "GITHUB_TOKEN",
        valueFrom = "${aws_secretsmanager_secret.backstage_secrets.arn}:GITHUB_TOKEN::" },
    ]

    portMappings = [{ containerPort = 7007, protocol = "tcp" }]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:7007/.backstage/health/v1/readiness || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 120
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/backstage-${var.environment}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "backstage"
      }
    }
  }])
}
```

## Backstage Docker Image (Build Stage in CI/CD)

```dockerfile
# Dockerfile for Backstage

FROM node:22-bookworm-slim AS packages
WORKDIR /app
COPY package.json yarn.lock ./
COPY .yarn ./.yarn
COPY .yarnrc.yml ./
COPY backstage.json ./
COPY packages packages
COPY plugins plugins
RUN find packages -mindepth 2 -maxdepth 2 \! -name "package.json" -exec rm -rf {} \+

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=packages /app .
RUN yarn install --immutable

COPY . .
RUN yarn tsc && yarn build:backend

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/.yarn ./.yarn
COPY --from=build /app/.yarnrc.yml ./
COPY --from=build /app/packages/backend/dist/bundle.tar.gz .
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz
RUN yarn workspaces focus --all --production

USER node
EXPOSE 7007
CMD ["node", "packages/backend", "--config", "app-config.yaml"]
```

## Conclusion

Deploying Backstage with OpenTofu creates an internal developer platform that grows with your organization. The `APP_CONFIG_` prefixed environment variables map directly to Backstage's `app-config.yaml` settings, allowing configuration without baking it into the Docker image. Build the Backstage Docker image in CI/CD (it includes your plugins and customizations), push to ECR, and reference the image tag in OpenTofu. The RDS backend is essential for multi-instance deployments - the in-memory SQLite backend won't work in ECS.
