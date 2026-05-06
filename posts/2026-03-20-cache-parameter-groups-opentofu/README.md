# How to Manage Cache Parameter Groups with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, ElastiCache, Cache Parameters, Infrastructure as Code

Description: Learn how to create and manage ElastiCache parameter groups with OpenTofu to tune Redis and Memcached behavior for performance, eviction, and reliability.

Parameter groups control the runtime behavior of ElastiCache clusters. Managing them in OpenTofu ensures your tuning decisions are documented, version-controlled, and applied consistently across environments.

## Redis Parameter Groups

```hcl
# Redis 7.x parameter group

resource "aws_elasticache_parameter_group" "redis7" {
  family = "redis7"
  name   = "production-redis7"
  description = "Production-tuned Redis 7 parameter group"

  # Memory eviction: remove least recently used keys when memory is full
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  # Number of samples for LRU eviction algorithm (higher = more accurate, more CPU)
  parameter {
    name  = "maxmemory-samples"
    value = "10"
  }

  # Enable keyspace notifications for expired key events (used for TTL-based workflows)
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  # Enable hash compression for small hashes
  parameter {
    name  = "hash-max-listpack-entries"
    value = "128"
  }

  parameter {
    name  = "hash-max-listpack-value"
    value = "64"
  }

  # Slow log threshold (microseconds)
  parameter {
    name  = "slowlog-log-slower-than"
    value = "10000"  # 10ms
  }

  parameter {
    name  = "slowlog-max-len"
    value = "128"
  }
}
```

## Maxmemory Policy Options

```hcl
# Session store: only evict keys with TTL set
resource "aws_elasticache_parameter_group" "session_store" {
  family      = "redis7"
  name        = "session-store-redis7"
  description = "For session storage - only evict keys with TTL set"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"  # Only evict keys with TTL
  }
}

# Cache: aggressively evict any key to make room
resource "aws_elasticache_parameter_group" "pure_cache" {
  family      = "redis7"
  name        = "pure-cache-redis7"
  description = "For pure caching - evict any key when memory full"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Evict any key, LRU order
  }
}

# Queue: never evict (return OOM error instead)
resource "aws_elasticache_parameter_group" "queue" {
  family      = "redis7"
  name        = "queue-redis7"
  description = "For queues - never evict data"

  parameter {
    name  = "maxmemory-policy"
    value = "noeviction"  # Return error if memory full
  }
}
```

## Memcached Parameter Group

```hcl
resource "aws_elasticache_parameter_group" "memcached" {
  family      = "memcached1.6"
  name        = "production-memcached"
  description = "Production Memcached parameter group"

  # Maximum size of a single cache item
  parameter {
    name  = "max_item_size"
    value = "10485760"  # 10 MB
  }

  # Slab growth factor
  parameter {
    name  = "chunk_size_growth_factor"
    value = "1.25"
  }
}
```

## Environment-Specific Parameter Groups

```hcl
locals {
  redis_params = {
    dev = {
      maxmemory_policy  = "allkeys-lru"
      slowlog_threshold = "100000"  # 100ms in dev
      notify_events     = ""        # Disabled in dev
    }
    production = {
      maxmemory_policy  = "allkeys-lru"
      slowlog_threshold = "10000"   # 10ms in prod
      notify_events     = "Ex"      # Expired events enabled
    }
  }
}

resource "aws_elasticache_parameter_group" "envs" {
  for_each = local.redis_params

  family      = "redis7"
  name        = "${each.key}-redis7"
  description = "${each.key} Redis parameter group"

  parameter {
    name  = "maxmemory-policy"
    value = each.value.maxmemory_policy
  }

  parameter {
    name  = "slowlog-log-slower-than"
    value = each.value.slowlog_threshold
  }

  dynamic "parameter" {
    for_each = each.value.notify_events != "" ? [each.value.notify_events] : []
    content {
      name  = "notify-keyspace-events"
      value = parameter.value
    }
  }
}
```

## Conclusion

ElastiCache parameter groups in OpenTofu give you documented, version-controlled cache tuning. Choose the right maxmemory-policy for your use case: allkeys-lru for pure caches, volatile-lru for session stores, and noeviction for queues. Enable keyspace notifications only when needed as they add overhead, and set slowlog thresholds to detect performance issues early.
