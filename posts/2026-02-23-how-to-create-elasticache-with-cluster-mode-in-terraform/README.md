# How to Create ElastiCache with Cluster Mode in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ElastiCache, Redis, Caching, Infrastructure as Code, Cluster

Description: Learn how to create and configure Amazon ElastiCache Redis clusters with cluster mode enabled using Terraform for scalable, high-performance caching.

---

Amazon ElastiCache for Redis with cluster mode enabled allows you to partition your data across multiple shards, giving you greater scalability and throughput than a single-node or single-shard setup. Each shard has a primary node and up to five replica nodes, providing both horizontal scaling and high availability. In this guide, we will walk through how to create ElastiCache Redis clusters with cluster mode using Terraform.

## Understanding Cluster Mode

When you enable cluster mode on an ElastiCache Redis cluster, your data is automatically partitioned across multiple shards using hash slots. Redis Cluster divides the keyspace into 16,384 hash slots and distributes them across your shards. This means you can store more data than a single node can handle and achieve higher write throughput since writes are distributed across multiple primaries.

There are some trade-offs to be aware of. Multi-key operations only work when all keys involved reside on the same shard. You need to use hash tags to ensure related keys are placed on the same shard. Additionally, some Redis commands like KEYS and SCAN operate on a per-shard basis rather than across the entire cluster.

## Setting Up the Provider and Networking

```hcl
# Configure Terraform and the AWS provider
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

# Create a VPC for the ElastiCache cluster
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "elasticache-vpc"
  }
}

# Create subnets in multiple availability zones
resource "aws_subnet" "cache_subnet_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "cache-subnet-a"
  }
}

resource "aws_subnet" "cache_subnet_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  tags = {
    Name = "cache-subnet-b"
  }
}

resource "aws_subnet" "cache_subnet_c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1c"

  tags = {
    Name = "cache-subnet-c"
  }
}

# Create a subnet group for ElastiCache
resource "aws_elasticache_subnet_group" "cache_subnets" {
  name       = "cache-subnet-group"
  subnet_ids = [
    aws_subnet.cache_subnet_a.id,
    aws_subnet.cache_subnet_b.id,
    aws_subnet.cache_subnet_c.id,
  ]

  tags = {
    Environment = "production"
  }
}
```

## Creating a Security Group

```hcl
# Security group for ElastiCache
resource "aws_security_group" "cache_sg" {
  name_prefix = "elasticache-"
  vpc_id      = aws_vpc.main.id

  # Allow Redis traffic from within the VPC
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "Allow Redis connections from VPC"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "elasticache-sg"
  }
}
```

## Creating a Redis Cluster with Cluster Mode Enabled

With cluster mode, you use the `aws_elasticache_replication_group` resource. The key parameters are `num_node_groups` (number of shards) and `replicas_per_node_group` (number of replicas per shard):

```hcl
# Create a Redis cluster with cluster mode enabled
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id = "redis-cluster"
  description          = "Redis cluster with cluster mode enabled"

  # Node configuration
  node_type            = "cache.r6g.large"  # Choose based on your workload
  port                 = 6379

  # Cluster mode configuration
  num_node_groups         = 3  # Number of shards
  replicas_per_node_group = 2  # 2 replicas per shard (total 3 nodes per shard)

  # Engine configuration
  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = aws_elasticache_parameter_group.cluster_params.name

  # Network configuration
  subnet_group_name  = aws_elasticache_subnet_group.cache_subnets.name
  security_group_ids = [aws_security_group.cache_sg.id]

  # High availability settings
  automatic_failover_enabled = true  # Required for cluster mode
  multi_az_enabled           = true  # Distribute replicas across AZs

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token  # Optional authentication

  # Maintenance window
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_window          = "03:00-04:00"
  snapshot_retention_limit = 7  # Keep snapshots for 7 days

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Parameter group for cluster mode
resource "aws_elasticache_parameter_group" "cluster_params" {
  name   = "redis-cluster-params"
  family = "redis7"

  # Enable cluster mode
  parameter {
    name  = "cluster-enabled"
    value = "yes"
  }

  # Set maximum memory policy
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Evict least recently used keys when memory is full
  }

  tags = {
    Environment = "production"
  }
}

# Variable for the auth token
variable "redis_auth_token" {
  description = "Auth token for Redis authentication"
  type        = string
  sensitive   = true
  default     = null
}
```

## Scaling the Cluster

One advantage of cluster mode is horizontal scaling. You can add or remove shards to adjust capacity:

```hcl
# To scale up, increase num_node_groups
resource "aws_elasticache_replication_group" "scalable_cluster" {
  replication_group_id = "scalable-redis"
  description          = "Scalable Redis cluster"

  node_type                  = "cache.r6g.large"
  num_node_groups            = 6  # Increased from 3 to 6 shards
  replicas_per_node_group    = 1
  automatic_failover_enabled = true

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = aws_elasticache_parameter_group.cluster_params.name
  subnet_group_name    = aws_elasticache_subnet_group.cache_subnets.name
  security_group_ids   = [aws_security_group.cache_sg.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

When you change the number of shards, ElastiCache performs online resharding, redistributing hash slots across the new shard configuration. This happens with minimal downtime.

## Outputs for Application Configuration

```hcl
# Output the cluster configuration endpoint
output "cluster_configuration_endpoint" {
  description = "Configuration endpoint for the Redis cluster"
  value       = aws_elasticache_replication_group.redis_cluster.configuration_endpoint_address
}

output "cluster_port" {
  description = "Port number for the Redis cluster"
  value       = aws_elasticache_replication_group.redis_cluster.port
}

# Output individual member clusters
output "member_clusters" {
  description = "List of member clusters in the replication group"
  value       = aws_elasticache_replication_group.redis_cluster.member_clusters
}
```

When connecting from your application, use the configuration endpoint rather than individual node endpoints. Redis clients that support cluster mode will automatically discover the cluster topology and route commands to the correct shard.

## Configuring Auto Scaling

ElastiCache supports auto scaling for replica nodes within each shard:

```hcl
# Register the replication group as a scalable target
resource "aws_appautoscaling_target" "redis_replicas" {
  service_namespace  = "elasticache"
  scalable_dimension = "elasticache:replication-group:Replicas"
  resource_id        = "replication-group/${aws_elasticache_replication_group.redis_cluster.replication_group_id}"
  min_capacity       = 1
  max_capacity       = 5
}

# Auto scaling policy based on CPU utilization
resource "aws_appautoscaling_policy" "redis_cpu_scaling" {
  name               = "redis-cpu-scaling"
  service_namespace  = aws_appautoscaling_target.redis_replicas.service_namespace
  scalable_dimension = aws_appautoscaling_target.redis_replicas.scalable_dimension
  resource_id        = aws_appautoscaling_target.redis_replicas.resource_id
  policy_type        = "TargetTrackingScaling"

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ElastiCachePrimaryEngineCPUUtilization"
    }
    target_value = 65.0  # Scale when CPU exceeds 65%
  }
}
```

## Monitoring and Alerts

Setting up monitoring ensures you catch performance issues before they affect users:

```hcl
# CloudWatch alarm for high CPU usage
resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "redis-cluster-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis cluster CPU utilization is too high"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis_cluster.replication_group_id
  }

  alarm_actions = [aws_sns_topic.cache_alerts.arn]
}

resource "aws_sns_topic" "cache_alerts" {
  name = "redis-cluster-alerts"
}
```

For comprehensive cache monitoring, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) provides dashboards that track cache hit rates, memory usage, and connection counts.

## Best Practices

Always use at least three shards with cluster mode to distribute load evenly. Enable Multi-AZ for production workloads so replicas are spread across availability zones. Use hash tags when you need multiple keys to land on the same shard for multi-key operations. Set appropriate eviction policies based on your use case. Enable both at-rest and in-transit encryption for security. Test failover scenarios in non-production environments to understand the behavior during shard failures.

## Conclusion

ElastiCache with cluster mode enabled gives you horizontal scaling capabilities that single-shard deployments cannot match. By defining your cluster configuration in Terraform, you get repeatable, version-controlled infrastructure that can be scaled as your application grows. Start with a modest number of shards and scale out as your data and throughput requirements increase.
