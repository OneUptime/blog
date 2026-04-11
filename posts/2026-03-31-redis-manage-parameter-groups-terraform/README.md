# How to Manage Redis Parameter Groups with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Terraform, ElastiCache, Parameter Group, AWS

Description: Learn how to create and manage AWS ElastiCache Redis parameter groups with Terraform to customize Redis configuration for your production workloads.

---

AWS ElastiCache parameter groups let you customize Redis configuration settings like `maxmemory-policy`, `notify-keyspace-events`, and `timeout` without modifying the Redis binary. Managing them with Terraform gives you version-controlled, repeatable Redis tuning.

## Default vs. Custom Parameter Groups

AWS provides default parameter groups like `default.redis7` but you cannot modify them. To customize Redis settings, you must create a custom parameter group.

## Creating a Custom Parameter Group

```hcl
resource "aws_elasticache_parameter_group" "redis" {
  name        = "redis7-production"
  family      = "redis7"
  description = "Production Redis parameter group"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  tags = {
    Environment = "production"
  }
}
```

## Parameter Reference

Common parameters and their recommended values:

| Parameter | Default | Recommended | Purpose |
|-----------|---------|-------------|---------|
| `maxmemory-policy` | `volatile-lru` | `allkeys-lru` | Evict least recently used keys |
| `timeout` | `0` | `300` | Close idle connections after 5 minutes |
| `tcp-keepalive` | `300` | `60` | Detect dead connections faster |
| `notify-keyspace-events` | `""` | `"Ex"` | Enable expired key notifications |

In Terraform:

```hcl
parameter {
  name  = "maxmemory-policy"
  value = "allkeys-lru"
}
```

## Attaching the Parameter Group to a Replication Group

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id   = "my-redis"
  description            = "Production Redis"
  node_type              = "cache.t3.medium"
  num_cache_clusters     = 2
  engine_version         = "7.1"
  parameter_group_name   = aws_elasticache_parameter_group.redis.name
  subnet_group_name      = aws_elasticache_subnet_group.redis.name
  security_group_ids     = [aws_security_group.redis.id]
}
```

## Environment-Specific Parameter Groups

Use Terraform variables to manage different settings per environment:

```hcl
variable "redis_max_memory_policy" {
  description = "Redis eviction policy"
  default     = "allkeys-lru"
}

variable "redis_timeout" {
  description = "Idle connection timeout in seconds"
  default     = "300"
}

resource "aws_elasticache_parameter_group" "redis" {
  name   = "redis7-${var.environment}"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = var.redis_max_memory_policy
  }

  parameter {
    name  = "timeout"
    value = var.redis_timeout
  }
}
```

## Apply and Verify

```bash
terraform apply

# Verify parameter group settings via AWS CLI
aws elasticache describe-cache-parameters \
  --cache-parameter-group-name redis7-production \
  --region us-east-1 \
  --query 'Parameters[?ParameterValue!=`null`].[ParameterName,ParameterValue]' \
  --output table
```

Expected output:

```text
-----------------------------------
|   DescribeCacheParameters       |
+---------------------------+------+
|  maxmemory-policy         | allkeys-lru |
|  timeout                  | 300  |
|  tcp-keepalive            | 60   |
+---------------------------+------+
```

## Summary

Custom ElastiCache parameter groups managed with Terraform give you fine-grained control over Redis behavior in a repeatable, auditable way. Set `maxmemory-policy` to `allkeys-lru` for caching workloads and enable `timeout` to reclaim idle connections. Use separate parameter groups per environment and attach them to your replication group via `parameter_group_name`.
