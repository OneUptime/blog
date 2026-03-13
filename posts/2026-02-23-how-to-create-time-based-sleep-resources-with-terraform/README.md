# How to Create Time-Based Sleep Resources with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Time Provider, Time Sleep, Infrastructure as Code, Deployments

Description: Learn how to use time_sleep resources in Terraform to handle propagation delays, staged deployments, rate limiting, and resource dependency timing issues.

---

The time_sleep resource in Terraform introduces a configurable wait period during resource creation or destruction. While adding delays might seem like an anti-pattern, there are legitimate scenarios where they are necessary. IAM role propagation in AWS can take up to 30 seconds, DNS records need time to propagate, and some APIs have rate limits that require spacing out requests. The time_sleep resource handles these cases gracefully within your Terraform configuration.

In this guide, we will explore when and how to use time_sleep effectively. We will cover IAM propagation delays, DNS propagation waits, staged deployment patterns, and rate limiting strategies.

## Understanding time_sleep

The time_sleep resource pauses Terraform execution for a specified duration during create or destroy operations. It supports separate durations for creation and destruction, and it participates in Terraform's dependency graph like any other resource. This means you can use depends_on and reference it from other resources to create ordered execution with built-in waits.

## Provider Setup

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Handling IAM Role Propagation

The most common use case is waiting for IAM roles to propagate after creation:

```hcl
# iam-propagation.tf - Wait for IAM role to propagate
resource "aws_iam_role" "lambda" {
  name = "lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Wait for IAM to propagate globally
resource "time_sleep" "iam_propagation" {
  depends_on = [
    aws_iam_role.lambda,
    aws_iam_role_policy_attachment.lambda_basic
  ]

  # AWS IAM can take up to 30 seconds to propagate
  create_duration = "30s"
}

# Lambda function only created after IAM has propagated
resource "aws_lambda_function" "app" {
  depends_on = [time_sleep.iam_propagation]

  function_name = "app-${var.environment}"
  role          = aws_iam_role.lambda.arn
  runtime       = "python3.11"
  handler       = "handler.lambda_handler"
  filename      = "${path.module}/lambda.zip"
}
```

## Waiting for DNS Propagation

After creating DNS records, wait before resources that depend on them:

```hcl
# dns-propagation.tf - Wait for DNS records to propagate
resource "aws_route53_record" "api" {
  zone_id = var.zone_id
  name    = "api.${var.domain}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

variable "zone_id" {
  type    = string
  default = "Z1234567890"
}

variable "domain" {
  type    = string
  default = "example.com"
}

variable "alb_dns_name" {
  type    = string
  default = "my-alb-123.us-east-1.elb.amazonaws.com"
}

variable "alb_zone_id" {
  type    = string
  default = "Z35SXDOTRQ7X7K"
}

# Wait for DNS to propagate
resource "time_sleep" "dns_propagation" {
  depends_on = [aws_route53_record.api]

  create_duration = "60s"  # Wait 60 seconds for DNS propagation
}

# ACM certificate validation depends on DNS being ready
resource "aws_acm_certificate" "api" {
  depends_on = [time_sleep.dns_propagation]

  domain_name       = "api.${var.domain}"
  validation_method = "DNS"
}
```

## Staged Deployment Pattern

Deploy resources in stages with waits between them:

```hcl
# staged-deployment.tf - Deploy in stages with cooldown periods
variable "service_names" {
  type    = list(string)
  default = ["service-a", "service-b", "service-c"]
}

# Stage 1: Deploy the database
resource "aws_db_instance" "app" {
  identifier     = "app-${var.environment}"
  engine         = "postgres"
  instance_class = "db.t3.medium"
  allocated_storage = 20
  username       = "admin"
  password       = "temporary"

  skip_final_snapshot = true
}

# Wait for database to be fully ready
resource "time_sleep" "db_ready" {
  depends_on      = [aws_db_instance.app]
  create_duration = "120s"  # Wait 2 minutes for DB to be fully ready
}

# Stage 2: Deploy the cache layer
resource "aws_elasticache_cluster" "app" {
  depends_on = [time_sleep.db_ready]

  cluster_id           = "app-cache-${var.environment}"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1
}

# Wait for cache to be available
resource "time_sleep" "cache_ready" {
  depends_on      = [aws_elasticache_cluster.app]
  create_duration = "60s"
}

# Stage 3: Deploy the application (depends on both DB and cache)
resource "aws_ecs_service" "app" {
  depends_on = [time_sleep.cache_ready]

  name            = "app-${var.environment}"
  cluster         = var.ecs_cluster_id
  task_definition = var.task_definition_arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = var.security_group_ids
  }
}

variable "ecs_cluster_id" {
  type    = string
  default = "cluster-123"
}

variable "task_definition_arn" {
  type    = string
  default = "arn:aws:ecs:us-east-1:123:task-definition/app:1"
}

variable "subnet_ids" {
  type    = list(string)
  default = ["subnet-1", "subnet-2"]
}

variable "security_group_ids" {
  type    = list(string)
  default = ["sg-1"]
}
```

## Destroy-Time Delays

Wait before destroying resources to allow graceful shutdown:

```hcl
# graceful-destroy.tf - Graceful shutdown with destroy delay
resource "time_sleep" "drain_connections" {
  # No delay on create
  create_duration = "0s"

  # Wait 60 seconds before destroying to drain connections
  destroy_duration = "60s"
}

resource "aws_lb_target_group_attachment" "app" {
  depends_on = [time_sleep.drain_connections]

  target_group_arn = var.target_group_arn
  target_id        = var.instance_id
  port             = 8080
}

variable "target_group_arn" {
  type    = string
  default = "arn:aws:elasticloadbalancing:us-east-1:123:targetgroup/app/123"
}

variable "instance_id" {
  type    = string
  default = "i-12345678"
}
```

## Rate Limiting API Calls

Space out resource creation to avoid API rate limits:

```hcl
# rate-limiting.tf - Avoid API rate limits with delays
variable "custom_domains" {
  type    = list(string)
  default = ["api.example.com", "app.example.com", "admin.example.com"]
}

# Create certificates with delays between each
resource "aws_acm_certificate" "domains" {
  count = length(var.custom_domains)

  domain_name       = var.custom_domains[count.index]
  validation_method = "DNS"
}

# Stagger the creation to avoid rate limits
resource "time_sleep" "cert_spacing" {
  count = length(var.custom_domains) - 1

  depends_on      = [aws_acm_certificate.domains]
  create_duration = "10s"
}
```

## Using Triggers to Control When Sleep Runs

```hcl
# triggers.tf - Conditional sleep based on triggers
resource "time_sleep" "conditional" {
  create_duration = "30s"

  triggers = {
    # Only sleep again when the config changes
    config_hash = md5(jsonencode(var.app_config))
  }
}

variable "app_config" {
  type = map(string)
  default = {
    version  = "2.0"
    replicas = "3"
  }
}
```

## Best Practices and When Not to Use Sleep

Time sleep should be used sparingly. Here are guidelines for when it is and is not appropriate:

Use time_sleep when dealing with eventual consistency in AWS services like IAM propagation, when you need to respect API rate limits, and when implementing staged deployments that require cooldown periods.

Do not use time_sleep when proper resource dependencies would solve the problem. If resource B naturally depends on resource A through a reference, Terraform already handles the ordering. Also avoid using sleep to work around Terraform bugs as those should be reported and fixed instead.

```hcl
# When sleep is NOT needed - Terraform handles this automatically
resource "aws_security_group" "app" {
  name   = "app-${var.environment}"
  vpc_id = var.vpc_id
}

variable "vpc_id" {
  type    = string
  default = "vpc-12345"
}

# No sleep needed - Terraform knows to create the SG first
resource "aws_instance" "app" {
  ami             = "ami-12345678"
  instance_type   = "t3.medium"
  security_groups = [aws_security_group.app.id]  # Implicit dependency
}
```

## Conclusion

The time_sleep resource is a practical tool for handling timing-related issues in Terraform deployments. While it should be used sparingly, it is invaluable for dealing with IAM propagation, DNS propagation, staged deployments, and API rate limits. The key is to use it only when proper resource dependencies are not sufficient to solve the timing issue. For other time-based patterns in Terraform, check out [time_rotating](https://oneuptime.com/blog/post/2026-02-23-how-to-create-rotating-time-resources-with-terraform/view) for scheduled rotations and [time_offset](https://oneuptime.com/blog/post/2026-02-23-how-to-create-time-based-offsets-with-terraform/view) for date calculations.
