# Validation Summary: How to Configure ElastiCache Global Datastore for Multi-Region

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache Global Datastore
- ElastiCache for Redis OSS / Valkey
- AWS CLI
- Amazon CloudWatch metrics and alarms
- Python redis-py client

## Sources Consulted
- Amazon ElastiCache User Guide: Prerequisites and limitations for Global Datastore - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Redis-Global-Datastores-Getting-Started.html
- Amazon ElastiCache User Guide: Using Global Datastores with the AWS CLI - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Redis-Global-Datastores-CLI.html
- Amazon ElastiCache User Guide: Using Global Datastores with the console - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Redis-Global-Datastores-Console.html
- AWS CLI Command Reference: create-replication-group - https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- AWS CLI Command Reference: create-global-replication-group - https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-global-replication-group.html
- AWS CLI Command Reference: failover-global-replication-group - https://docs.aws.amazon.com/cli/latest/reference/elasticache/failover-global-replication-group.html
- Amazon ElastiCache User Guide: In-transit encryption - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html
- Amazon ElastiCache User Guide: Monitoring with CloudWatch metrics - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.html

## Issues Found
- The prerequisites incorrectly said cluster mode enabled is required. AWS supports Global Datastore with cluster mode enabled or disabled, so the post now says the guide uses cluster mode enabled rather than requiring it.
- The prerequisites listed only r5 and r6g node types. AWS currently supports several large-and-above families for Global Datastore, so the list was updated to include the documented supported families.
- The prerequisites implied in-transit encryption is required. AWS documents it as supported, and the CLI requires a cache subnet group when in-transit encryption is enabled, so the wording was corrected and the primary create command now includes `--cache-subnet-group-name`.
- The secondary `create-replication-group` commands passed settings such as `--cache-node-type`, `--num-node-groups`, and `--automatic-failover-enabled`. AWS documentation says ElastiCache infers those values from the primary global replication group and they should not be passed when creating a secondary. Those flags were removed.
- The local-write option implied that secondary-side writes could later be synced by Global Datastore. Secondary clusters are read-only and Global Datastore does not replicate writes from a secondary back to the primary, so the text now describes using a separate local store or queue with later reconciliation through the primary Region.
- The CloudWatch replication lag examples used `GlobalReplicationGroupId` as the metric dimension and used `5000` for a five-second alarm threshold. ElastiCache publishes metrics for cache nodes, and AWS documents Global Datastore replica lag in seconds, so the examples now use a secondary cache node ID and a threshold of `5`.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI verification was done against the current official AWS CLI command reference.
- The Python `redis.RedisCluster` example is syntactically valid for modern redis-py and matches the cluster-mode-enabled endpoint pattern used in the post.
