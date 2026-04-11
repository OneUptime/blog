# How to Configure ElastiCache Redis Parameter Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ElastiCache, AWS, Parameter Group, Configuration

Description: Learn how to create and apply custom ElastiCache Redis parameter groups to tune memory, eviction, timeout, and persistence settings for your workloads.

---

ElastiCache Redis parameter groups let you control engine-level settings without SSH access to nodes. Every cluster is associated with one parameter group, and changes take effect on reboot (or live for dynamic params).

## Default vs Custom Parameter Groups

AWS provides default parameter groups like `default.redis7` that cannot be modified. To customize settings, create a family-specific parameter group.

```bash
aws elasticache create-cache-parameter-group \
  --cache-parameter-group-name my-redis7-params \
  --cache-parameter-group-family redis7 \
  --description "Production tuned Redis 7 parameters"
```

## Viewing Available Parameters

```bash
aws elasticache describe-engine-default-parameters \
  --cache-parameter-group-family redis7 \
  --query "EngineDefaults.Parameters[*].{Name:ParameterName,Default:ParameterValue,Type:DataType}" \
  --output table
```

## Commonly Tuned Parameters

| Parameter | Default | Recommended |
|---|---|---|
| `maxmemory-policy` | noeviction | allkeys-lru |
| `timeout` | 0 | 300 |
| `tcp-keepalive` | 300 | 60 |
| `lazyfree-lazy-eviction` | no | yes |
| `activedefrag` | no | yes (if >= r6g) |

## Applying Custom Parameters

```bash
aws elasticache modify-cache-parameter-group \
  --cache-parameter-group-name my-redis7-params \
  --parameter-name-values \
    ParameterName=maxmemory-policy,ParameterValue=allkeys-lru \
    ParameterName=timeout,ParameterValue=300 \
    ParameterName=tcp-keepalive,ParameterValue=60 \
    ParameterName=lazyfree-lazy-eviction,ParameterValue=yes
```

## Attaching the Group to a Cluster

```bash
aws elasticache modify-replication-group \
  --replication-group-id my-redis-cluster \
  --cache-parameter-group-name my-redis7-params \
  --apply-immediately
```

## Terraform Example

```hcl
resource "aws_elasticache_parameter_group" "redis7" {
  name   = "my-redis7-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "lazyfree-lazy-eviction"
    value = "yes"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "my-cluster"
  description          = "Production Redis"
  parameter_group_name = aws_elasticache_parameter_group.redis7.name
  # ... other settings
}
```

## Verifying Changes

```bash
aws elasticache describe-cache-parameters \
  --cache-parameter-group-name my-redis7-params \
  --query "Parameters[?ParameterValue!=null].{Name:ParameterName,Value:ParameterValue}"
```

## Monitoring Impact

After changing `maxmemory-policy`, watch the `Evictions` CloudWatch metric. If evictions spike unexpectedly, revisit your policy choice. Use [OneUptime](https://oneuptime.com) to alert on eviction rate anomalies alongside application error rates.

## Summary

Custom ElastiCache Redis parameter groups let you tune memory eviction, connection timeouts, and lazy-free settings without touching the OS. Create a family-specific group, apply parameters via CLI or Terraform, then attach it to your replication group. Always test parameter changes in staging before applying to production.
