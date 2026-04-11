# Validation Summary: How to Scale ElastiCache Redis Cluster Up and Down

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis
- AWS CLI (`aws elasticache` commands)
- Terraform AWS Provider (`aws_elasticache_replication_group`, `aws_elasticache_serverless_cache`)
- Python boto3 (CloudWatch metrics)
- Amazon CloudWatch

## Sources Consulted
- AWS CLI ElastiCache reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/
- AWS ElastiCache `modify-replication-group` docs: https://docs.aws.amazon.com/cli/latest/reference/elasticache/modify-replication-group.html
- AWS ElastiCache `describe-replication-groups` response structure: https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-replication-groups.html
- AWS ElastiCache `modify-replication-group-shard-configuration` docs: https://docs.aws.amazon.com/cli/latest/reference/elasticache/modify-replication-group-shard-configuration.html
- AWS ElastiCache `increase-replica-count` / `decrease-replica-count` docs
- AWS ElastiCache CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheMetrics.html
- Terraform `aws_elasticache_replication_group` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform `aws_elasticache_serverless_cache` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_serverless_cache

## Issues Found

### 1. Incorrect JMESPath query field for node type
- **What was wrong:** The `describe-replication-groups` CLI query used `MemberClusters` aliased as `NodeType`. `MemberClusters` returns a list of cache cluster IDs (e.g., `["my-cluster-001", "my-cluster-002"]`), not the node type.
- **What was changed:** Replaced `MemberClusters` with `CacheNodeType` in the JMESPath query, which correctly returns the instance type (e.g., `cache.r7g.xlarge`).

### 2. Deprecated `cluster_mode` block in Terraform
- **What was wrong:** The Terraform config for the cluster-mode-enabled replication group included both top-level `num_node_groups`/`replicas_per_node_group` arguments and a nested `cluster_mode` block with a duplicate `replicas_per_node_group`. The `cluster_mode` block is deprecated in AWS provider v4+ and conflicts with the top-level arguments.
- **What was changed:** Removed the deprecated `cluster_mode` block. The top-level `num_node_groups` and `replicas_per_node_group` arguments are the correct way to configure cluster mode in current provider versions.

### 3. Wrong CloudWatch dimension for ElastiCache metrics
- **What was wrong:** The Python monitoring code used `ReplicationGroupId` as the CloudWatch dimension name. ElastiCache CloudWatch metrics use `CacheClusterId` (individual node) as the dimension, not the replication group ID. The code as written would return no datapoints.
- **What was changed:** Changed the dimension from `ReplicationGroupId` to `CacheClusterId`, renamed the function parameter from `replication_group_id` to `cache_cluster_id`, and updated the example calls to use a cache cluster ID (e.g., `my-cluster-001`) instead of a replication group ID.

## Review Notes
- The scaling recommendations (FreeableMemory thresholds, CPU thresholds, SwapUsage) are reasonable rules of thumb but are not official AWS prescriptions. They are presented appropriately as guidelines.
- The ElastiCache Serverless Terraform resource (`aws_elasticache_serverless_cache`) is a relatively new resource. The configuration shown is correct for current provider versions.
- The post correctly notes that vertical scaling causes a brief failover and that horizontal shard additions in cluster mode are online operations.
- The `r7g` instance family used in examples is a valid current-generation Graviton3 ElastiCache node family.
