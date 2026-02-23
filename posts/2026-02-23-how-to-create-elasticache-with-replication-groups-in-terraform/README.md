# How to Create ElastiCache with Replication Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ElastiCache, Redis, Replication, High Availability, Infrastructure as Code

Description: Learn how to create ElastiCache Redis replication groups in Terraform for high availability with automatic failover and read scaling.

---

Amazon ElastiCache replication groups provide high availability and read scaling for Redis workloads. A replication group consists of a primary node that handles both reads and writes, along with one or more read replica nodes that maintain copies of the data. If the primary node fails, ElastiCache automatically promotes a replica to become the new primary. In this guide, we will cover how to create and configure ElastiCache replication groups using Terraform.

## Understanding Replication Groups

A replication group in ElastiCache is the recommended way to deploy Redis for any workload that requires reliability. Unlike a standalone cache cluster, a replication group provides automatic failover, the ability to scale read throughput by distributing reads across replicas, and Multi-AZ deployment for resilience against availability zone failures.

You can create replication groups with or without cluster mode. Without cluster mode (the focus of this guide), all your data lives in a single shard with one primary and up to five replicas. This is simpler to work with since all Redis commands work without restrictions, and your application connects using a single primary endpoint for writes and a reader endpoint for reads.

## Setting Up Networking

```hcl
# Configure Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# VPC and subnet configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "cache-vpc"
  }
}

resource "aws_subnet" "cache_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "cache-subnet-a" }
}

resource "aws_subnet" "cache_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "us-east-1b"

  tags = { Name = "cache-subnet-b" }
}

resource "aws_subnet" "cache_c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = "us-east-1c"

  tags = { Name = "cache-subnet-c" }
}

# Subnet group for ElastiCache
resource "aws_elasticache_subnet_group" "redis_subnets" {
  name       = "redis-subnet-group"
  subnet_ids = [
    aws_subnet.cache_a.id,
    aws_subnet.cache_b.id,
    aws_subnet.cache_c.id,
  ]

  tags = {
    Environment = "production"
  }
}

# Security group
resource "aws_security_group" "redis_sg" {
  name_prefix = "redis-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "Redis access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "redis-security-group"
  }
}
```

## Creating a Basic Replication Group

Here is how to create a Redis replication group with one primary and two replicas:

```hcl
# Create a Redis replication group with automatic failover
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "app-redis"
  description          = "Redis replication group for the application"

  # Node configuration
  node_type = "cache.r6g.large"
  port      = 6379

  # Replication configuration (cluster mode disabled)
  num_cache_clusters = 3  # 1 primary + 2 replicas

  # Engine settings
  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = aws_elasticache_parameter_group.redis_params.name

  # Network settings
  subnet_group_name  = aws_elasticache_subnet_group.redis_subnets.name
  security_group_ids = [aws_security_group.redis_sg.id]

  # High availability
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  # Backup settings
  snapshot_window          = "02:00-03:00"
  snapshot_retention_limit = 7

  # Maintenance
  maintenance_window         = "sun:05:00-sun:06:00"
  auto_minor_version_upgrade = true

  # Notification
  notification_topic_arn = aws_sns_topic.redis_events.arn

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Parameter group for Redis 7
resource "aws_elasticache_parameter_group" "redis_params" {
  name   = "redis-replication-params"
  family = "redis7"

  # Configure memory management
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  # Enable keyspace notifications for pub/sub events
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Notify on expired key events
  }

  tags = {
    Environment = "production"
  }
}

# SNS topic for ElastiCache events
resource "aws_sns_topic" "redis_events" {
  name = "redis-events"
}
```

## Configuring Preferred Availability Zones

You can control which availability zones your nodes are placed in:

```hcl
# Replication group with preferred availability zones
resource "aws_elasticache_replication_group" "redis_with_azs" {
  replication_group_id       = "redis-multi-az"
  description                = "Redis with specific AZ placement"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3
  automatic_failover_enabled = true
  multi_az_enabled           = true

  # Specify preferred AZs for each node
  preferred_cache_cluster_azs = [
    "us-east-1a",  # Primary node
    "us-east-1b",  # First replica
    "us-east-1c",  # Second replica
  ]

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnets.name
  security_group_ids   = [aws_security_group.redis_sg.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Using Auth Tokens for Security

When transit encryption is enabled, you can require authentication:

```hcl
# Variable for the auth token
variable "redis_auth_token" {
  description = "Auth token for Redis authentication"
  type        = string
  sensitive   = true
}

# Replication group with authentication
resource "aws_elasticache_replication_group" "secure_redis" {
  replication_group_id       = "secure-redis"
  description                = "Secure Redis with auth token"
  node_type                  = "cache.m6g.large"
  num_cache_clusters         = 3
  automatic_failover_enabled = true

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnets.name
  security_group_ids   = [aws_security_group.redis_sg.id]

  # Enable encryption and authentication
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Adding Data Tiering

For cost optimization with large datasets, you can use data tiering with r6gd node types. Data tiering automatically moves less frequently accessed items to SSD storage:

```hcl
# Replication group with data tiering
resource "aws_elasticache_replication_group" "tiered_redis" {
  replication_group_id       = "tiered-redis"
  description                = "Redis with data tiering"
  node_type                  = "cache.r6gd.xlarge"  # Must use r6gd instances
  num_cache_clusters         = 3
  automatic_failover_enabled = true

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnets.name
  security_group_ids   = [aws_security_group.redis_sg.id]

  # Enable data tiering
  data_tiering_enabled = true

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Outputs for Application Use

```hcl
# Primary endpoint for write operations
output "primary_endpoint" {
  description = "Primary endpoint for Redis write operations"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

# Reader endpoint for read operations (load balanced across replicas)
output "reader_endpoint" {
  description = "Reader endpoint for Redis read operations"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}
```

Your application should use the primary endpoint for write operations and the reader endpoint for reads. The reader endpoint automatically distributes connections across all available replicas.

## Scaling Replicas

You can scale the number of replicas up or down by changing `num_cache_clusters`:

```hcl
# Scale from 3 to 5 cache clusters (1 primary + 4 replicas)
resource "aws_elasticache_replication_group" "scaled_redis" {
  replication_group_id       = "scaled-redis"
  description                = "Scaled Redis replication group"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 5  # Increased from 3
  automatic_failover_enabled = true
  multi_az_enabled           = true

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnets.name
  security_group_ids   = [aws_security_group.redis_sg.id]

  at_rest_encryption_enabled = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Monitoring the Replication Group

Track critical metrics to ensure your replication group is healthy:

```hcl
# Monitor replication lag
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  alarm_name          = "redis-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Maximum"
  threshold           = 5  # Seconds
  alarm_description   = "Redis replication lag is too high"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.replication_group_id
  }

  alarm_actions = [aws_sns_topic.redis_events.arn]
}

# Monitor memory usage
resource "aws_cloudwatch_metric_alarm" "memory_usage" {
  alarm_name          = "redis-memory-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis memory usage exceeds 80 percent"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.replication_group_id
  }

  alarm_actions = [aws_sns_topic.redis_events.arn]
}
```

For end-to-end visibility into your caching layer, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you build dashboards that correlate cache performance with application metrics.

## Best Practices

Use at least three cache clusters (one primary, two replicas) for production workloads. Enable Multi-AZ to survive availability zone failures. Always enable both at-rest and in-transit encryption. Use auth tokens for an additional layer of security. Configure snapshot retention so you can restore from backups if needed. Monitor replication lag to detect problems early. Use the reader endpoint to offload reads from the primary node.

## Conclusion

ElastiCache replication groups give you a robust, highly available Redis deployment that can handle both read scaling and automatic failover. Terraform makes it straightforward to define, version, and manage these replication groups as code. By following the patterns in this guide, you can set up production-grade Redis infrastructure that scales with your application and recovers automatically from failures.
