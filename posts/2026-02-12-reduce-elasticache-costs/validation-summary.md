# Validation Summary: How to Reduce ElastiCache Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon ElastiCache
- Redis OSS
- AWS CLI
- Amazon CloudWatch metrics
- Python
- redis-py
- boto3

## Sources Consulted
- AWS CLI `create-replication-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- AWS CLI `describe-reserved-cache-nodes-offerings` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/describe-reserved-cache-nodes-offerings.html
- AWS CLI `purchase-reserved-cache-nodes-offering` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/purchase-reserved-cache-nodes-offering.html
- AWS CLI `delete-replication-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/delete-replication-group.html
- AWS CLI `modify-replication-group` command reference: https://docs.aws.amazon.com/cli/latest/reference/elasticache/modify-replication-group.html
- Amazon ElastiCache supported node types: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.SupportedTypes.html
- Amazon ElastiCache reserved nodes: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.Reserved.html
- Amazon ElastiCache data tiering: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/data-tiering.html
- Amazon ElastiCache metrics for Valkey and Redis OSS: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Redis.html
- Amazon ElastiCache pricing: https://aws.amazon.com/elasticache/pricing/
- Boto3 ElastiCache `delete_replication_group` reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/elasticache/client/delete_replication_group.html
- Boto3 ElastiCache `describe_snapshots` reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/elasticache/client/describe_snapshots.html
- Redis TTL command documentation: https://redis.io/docs/latest/commands/ttl/
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/

## Issues Found
- The data tiering section described ElastiCache as moving data based on access frequency. AWS documents data tiering as moving least-recently used items between memory and SSD. Updated the wording to say "least-recently used" and "recent access."
- The non-production scheduling example used the same `FinalSnapshotIdentifier` every night. ElastiCache returns an error if a snapshot with that name already exists, so the example would fail after the first successful run. Updated the example to create a timestamped final snapshot and restore from the latest manual snapshot for the replication group.

## Review Notes
- The AWS CLI was not installed in the local workspace, so CLI validation was performed against the current official AWS CLI command reference rather than local `aws --help` output.
- Python snippets were parsed with `python3` for syntax validation. The examples remain illustrative and require installed dependencies, AWS credentials, network access, and real Redis/ElastiCache endpoints to execute.
- The post uses the service term "ElastiCache for Redis"; AWS documentation now commonly says "Valkey or Redis OSS," but the `--engine redis` CLI value remains current and valid.
