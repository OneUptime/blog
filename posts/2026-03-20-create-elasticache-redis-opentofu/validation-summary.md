# Validation Summary: How to Create AWS ElastiCache Redis with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS ElastiCache for Redis
- Redis 7.x (cluster mode disabled and cluster mode enabled)
- AWS Terraform provider (`hashicorp/aws`) resources: `aws_elasticache_subnet_group`, `aws_elasticache_replication_group`, `aws_elasticache_parameter_group`, `aws_security_group`
- AWS KMS (referenced for encryption-at-rest key)

## Sources Consulted
- [Terraform Registry: aws_elasticache_replication_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group)
- [Terraform Registry: aws_elasticache_parameter_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_parameter_group)
- [Terraform Registry: aws_elasticache_subnet_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_subnet_group)
- [AWS ElastiCache: Creating a parameter group](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ParameterGroups.Creating.html)
- [AWS ElastiCache: Parameter management](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/ParameterGroups.Management.html)
- [hashicorp/terraform-provider-aws issue #27748 — redis7 parameter group family](https://github.com/hashicorp/terraform-provider-aws/issues/27748)
- [hashicorp/terraform-provider-aws issue #27709 — redis7 effect](https://github.com/hashicorp/terraform-provider-aws/issues/27709)

## Issues Found
- **Incorrect parameter group family for Redis 7 cluster mode enabled.** The post used `family = "redis7.cluster.on"` for the cluster-mode-enabled parameter group, with a comment claiming cluster mode "uses different family". This naming convention applied to Redis 5.0 (`redis5.0.cluster.on`) and Redis 6.x (`redis6.x.cluster.on`), but AWS does **not** publish a `redis7.cluster.on` family — Redis 7 uses a single `redis7` family for both cluster mode disabled and cluster mode enabled. Applying the original config would fail with an `InvalidParameterCombination` error. Changed the family to `"redis7"` and updated the inline comment to reflect this.

## Review Notes
- The `description` argument on `aws_elasticache_replication_group` is correct for current AWS provider versions (v4.35+); the older `replication_group_description` is deprecated.
- `engine_version = "7.1"` is valid; not specifying `engine = "redis"` is fine since `redis` is the default.
- `auth_token` requires `transit_encryption_enabled = true`, which is satisfied in the example.
- `automatic_failover_enabled = true` is required for cluster mode enabled (`num_node_groups`/`replicas_per_node_group`); the post correctly notes this.
- The `aws_security_group` ingress block intentionally omits `egress` and relies on the AWS default-allow-all egress when the rule is not specified — this is conventional but readers may want to add explicit egress for stricter setups. Not a technical error.
- Snapshot/maintenance window strings (`"03:00-04:00"`, `"sun:04:00-sun:05:00"`) match the documented format (UTC, 60-minute window).
- `cache.r7g.large` is a valid Graviton-based node type for ElastiCache Redis.
- The `redis7` family supports the `notify-keyspace-events`, `maxmemory-policy`, and `maxmemory-samples` parameters used in the example.
