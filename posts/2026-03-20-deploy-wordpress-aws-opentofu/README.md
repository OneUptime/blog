# How to Deploy a WordPress Site with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, WordPress, AWS, ECS, RDS, Infrastructure as Code

Description: Learn how to deploy a production-ready WordPress site on AWS using OpenTofu, with ECS Fargate for compute, RDS for the database, and EFS for shared storage.

## Introduction

Running WordPress on AWS with OpenTofu provides a scalable, managed infrastructure. This guide deploys WordPress on ECS Fargate (serverless containers) with RDS MySQL for the database, EFS for shared WordPress files, and CloudFront for CDN caching.

## Architecture

```text
CloudFront Distribution
      ↓
Application Load Balancer
      ↓
ECS Fargate (WordPress containers)
      ↓                    ↓
RDS MySQL            EFS (wp-content)
```

## Networking and Security Groups

```hcl
module "vpc" {
  source  = "registry.opentofu.org/terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "wordpress-${var.environment}"
  cidr = "10.0.0.0/16"
  azs  = ["us-east-1a", "us-east-1b"]

  public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets  = ["10.0.3.0/24", "10.0.4.0/24"]
  database_subnets = ["10.0.5.0/24", "10.0.6.0/24"]

  enable_nat_gateway = true
}

resource "aws_security_group" "wordpress" {
  name   = "wordpress-ecs"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 80
    to_port         = 80
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

## RDS MySQL Database

```hcl
resource "aws_db_subnet_group" "wordpress" {
  name       = "wordpress-db-subnet"
  subnet_ids = module.vpc.database_subnets
}

resource "aws_db_instance" "wordpress" {
  identifier           = "wordpress-${var.environment}"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.medium"
  allocated_storage    = 20
  storage_encrypted    = true

  db_name  = "wordpress"
  username = "admin"
  password_wo         = var.db_password
  password_wo_version = var.db_password_version

  db_subnet_group_name   = aws_db_subnet_group.wordpress.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "wordpress-${var.environment}-final"

  lifecycle {
    prevent_destroy = true
  }
}
```

## EFS for WordPress Files

```hcl
resource "aws_efs_file_system" "wordpress" {
  creation_token = "wordpress-${var.environment}"
  encrypted      = true

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }
}

resource "aws_efs_mount_target" "wordpress" {
  for_each = toset(module.vpc.private_subnets)

  file_system_id  = aws_efs_file_system.wordpress.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}
```

## ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "wordpress" {
  family                   = "wordpress"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  volume {
    name = "wordpress-content"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.wordpress.id
      root_directory = "/"
    }
  }

  container_definitions = jsonencode([{
    name  = "wordpress"
    image = "wordpress:6.9-apache"

    environment = [
      { name = "WORDPRESS_DB_HOST", value = aws_db_instance.wordpress.endpoint },
      { name = "WORDPRESS_DB_NAME", value = "wordpress" },
      { name = "WORDPRESS_DB_USER", value = "admin" },
    ]

    secrets = [
      { name = "WORDPRESS_DB_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn }
    ]

    portMappings = [{ containerPort = 80, protocol = "tcp" }]

    mountPoints = [{
      sourceVolume  = "wordpress-content"
      containerPath = "/var/www/html/wp-content"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"  = "/ecs/wordpress"
        "awslogs-region" = var.region
        "awslogs-stream-prefix" = "wordpress"
      }
    }
  }])
}
```

## ECS Service and Load Balancer

```hcl
resource "aws_ecs_service" "wordpress" {
  name            = "wordpress"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.wordpress.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.wordpress.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.wordpress.arn
    container_name   = "wordpress"
    container_port   = 80
  }
}
```

## Summary

Deploying WordPress on AWS with OpenTofu uses ECS Fargate for containerized compute, RDS MySQL for managed database, EFS for shared `wp-content` storage (enabling multiple container instances), and an Application Load Balancer for traffic distribution. With OpenTofu 1.11+, use write-only attributes for the database password to keep secrets out of state, and add a CloudFront distribution in front of the load balancer for caching and DDoS protection.
