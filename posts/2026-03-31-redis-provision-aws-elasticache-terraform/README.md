# How to Provision AWS ElastiCache Redis with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Terraform, AWS, ElastiCache, Infrastructure

Description: Learn how to provision AWS ElastiCache for Redis using Terraform, including cluster mode, subnet groups, parameter groups, and security configuration.

---

AWS ElastiCache for Redis is a managed Redis service. Provisioning it with Terraform gives you repeatable, version-controlled infrastructure. This guide covers creating a production-ready ElastiCache Redis cluster with proper networking and security settings.

## Project Structure

```text
elasticache/
  main.tf
  variables.tf
  outputs.tf
```

## Step 1: Configure the AWS Provider and Variables

```hcl
# variables.tf
variable "aws_region" {
  default = "us-east-1"
}

variable "redis_node_type" {
  default = "cache.t3.medium"
}

variable "redis_auth_token" {
  description = "Redis AUTH token (password)"
  sensitive   = true
}

variable "vpc_id" {}
variable "private_subnet_ids" {
  type = list(string)
}

variable "app_security_group_id" {
  description = "Security group ID of the application layer allowed to access Redis"
}
```

## Step 2: Create the Subnet Group

```hcl
# main.tf
resource "aws_elasticache_subnet_group" "redis" {
  name       = "redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "redis-subnet-group"
  }
}
```

## Step 3: Create a Security Group

```hcl
resource "aws_security_group" "redis" {
  name        = "redis-sg"
  description = "Allow Redis access from application layer"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "redis-sg"
  }
}
```

## Step 4: Create the ElastiCache Replication Group

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "my-redis-cluster"
  description                = "Redis replication group for production"
  node_type                  = var.redis_node_type
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  engine_version             = "7.1"
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = {
    Environment = "production"
  }
}

resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/redis/slow-log"
  retention_in_days = 30
}
```

## Step 5: Outputs

```hcl
# outputs.tf
output "redis_primary_endpoint" {
  value     = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive = false
}

output "redis_reader_endpoint" {
  value = aws_elasticache_replication_group.redis.reader_endpoint_address
}
```

## Deploy

```bash
terraform init
terraform plan -var="redis_auth_token=your-strong-token" \
               -var="vpc_id=vpc-abc123" \
               -var="private_subnet_ids=[\"subnet-1\",\"subnet-2\"]" \
               -var="app_security_group_id=sg-app123"
terraform apply -var="redis_auth_token=your-strong-token" \
                -var="vpc_id=vpc-abc123" \
                -var="private_subnet_ids=[\"subnet-1\",\"subnet-2\"]" \
                -var="app_security_group_id=sg-app123" \
                -auto-approve
```

After apply, get the endpoint:

```bash
terraform output redis_primary_endpoint
```

## Summary

Terraform makes it straightforward to provision AWS ElastiCache Redis with encryption, Multi-AZ failover, and proper VPC networking. Separate your subnet groups, security groups, and replication group resources for clarity. Always enable `at_rest_encryption_enabled` and `transit_encryption_enabled` with an auth token for production workloads.
