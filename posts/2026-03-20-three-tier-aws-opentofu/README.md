# How to Build a Three-Tier Web Application Architecture with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Architecture, Three-Tier, OpenTofu, VPC, RDS, ECS, Load Balancer

Description: Learn how to build a production-ready three-tier web application architecture on AWS using OpenTofu with a VPC, Application Load Balancer, ECS Fargate, and RDS Aurora.

## Overview

The three-tier architecture separates presentation (Application Load Balancer), application logic (ECS containers), and data (RDS Aurora) into distinct layers. OpenTofu provisions the complete stack with proper network isolation and security groups.

## Step 1: VPC with Public and Private Subnets

```hcl
# main.tf - Three-tier VPC

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "three-tier-vpc"
  cidr = "10.0.0.0/16"

  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnets   = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]    # ALB tier
  private_subnets  = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"] # App tier
  database_subnets = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"] # Data tier

  enable_nat_gateway   = true
  single_nat_gateway   = false
  one_nat_gateway_per_az = true  # One per AZ for HA
  enable_dns_hostnames  = true
  enable_dns_support    = true
}
```

## Step 2: Presentation Tier - Application Load Balancer

```hcl
# ALB in public subnets
resource "aws_lb" "app" {
  name               = "three-tier-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    enabled = true
  }
}

resource "aws_lb_target_group" "app" {
  name        = "three-tier-app-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"  # Required for ECS tasks using awsvpc/Fargate

  health_check {
    path    = "/health"
    matcher = "200-399"
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Redirect HTTP to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.app.arn
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

## Step 3: Application Tier - ECS Fargate

```hcl
# ECS cluster for application containers
resource "aws_ecs_cluster" "app" {
  name = "three-tier-app"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "app"
    image = "${aws_ecr_repository.app.repository_url}:latest"
    portMappings = [{ containerPort = 8080 }]
    environment = [
      { name = "DB_HOST", value = aws_rds_cluster.aurora.endpoint }
    ]
    secrets = [
      { name = "DB_PASSWORD", valueFrom = "${aws_rds_cluster.aurora.master_user_secret[0].secret_arn}:password::" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"  = aws_cloudwatch_log_group.app.name
        "awslogs-region" = "us-east-1"
        "awslogs-stream-prefix" = "app"
      }
    }
  }])
}

resource "aws_ecs_service" "app" {
  name            = "app"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Ensures the target group is associated with the ALB before ECS registers tasks.
  depends_on = [aws_lb_listener.https]
}
```

## Step 4: Data Tier - Aurora PostgreSQL

```hcl
# Aurora PostgreSQL cluster in database subnets
resource "aws_db_subnet_group" "aurora" {
  name       = "aurora-subnet-group"
  subnet_ids = module.vpc.database_subnets
}

resource "aws_rds_cluster" "aurora" {
  cluster_identifier      = "three-tier-aurora"
  engine                  = "aurora-postgresql"
  engine_version          = "15.17"
  database_name           = "appdb"
  master_username         = "dbadmin"
  manage_master_user_password = true  # AWS Secrets Manager

  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.db.id]

  backup_retention_period = 7
  deletion_protection     = true
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.rds.arn

  enabled_cloudwatch_logs_exports = ["postgresql"]
}

resource "aws_rds_cluster_instance" "aurora_instances" {
  count              = 2
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version
  publicly_accessible = false
}
```

## Summary

The three-tier architecture on AWS built with OpenTofu isolates each layer in dedicated subnets with restrictive security groups: the ALB accepts internet traffic on the listener ports, app containers receive traffic only from the ALB and connect to the database, and Aurora accepts connections only from the application security group. This design provides defense-in-depth, scales each tier independently, and uses managed services to minimize operational overhead.
