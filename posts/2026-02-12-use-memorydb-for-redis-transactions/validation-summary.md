# Validation Summary: How to Use MemoryDB for Redis Transactions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon MemoryDB
- AWS CLI
- Amazon CloudWatch
- Redis OSS transactions
- Redis Cluster hash tags
- redis-py
- Python
- Lua scripting for Redis

## Sources Consulted
- Amazon MemoryDB features: https://docs.aws.amazon.com/memorydb/latest/devguide/servicename-feature-overview.html
- Amazon MemoryDB ACLs and access strings: https://docs.aws.amazon.com/memorydb/latest/devguide/clusters.acls.html
- AWS CLI `memorydb create-user`: https://docs.aws.amazon.com/cli/latest/reference/memorydb/create-user.html
- AWS CLI `memorydb create-subnet-group`: https://docs.aws.amazon.com/cli/latest/reference/memorydb/create-subnet-group.html
- AWS CLI `memorydb create-cluster`: https://docs.aws.amazon.com/cli/latest/reference/memorydb/create-cluster.html
- Amazon MemoryDB core components, nodes, and shards: https://docs.aws.amazon.com/memorydb/latest/devguide/components.html
- Amazon MemoryDB CloudWatch metrics: https://docs.aws.amazon.com/memorydb/latest/devguide/metrics.memorydb.html
- Amazon MemoryDB metric monitoring examples: https://docs.aws.amazon.com/memorydb/latest/devguide/cloudwatchmetrics.html
- AWS CLI `cloudwatch get-metric-statistics`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI `cloudwatch put-metric-alarm`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Redis transactions: https://redis.io/docs/latest/develop/using-commands/transactions/
- Redis Cluster scaling and hash slot behavior: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- redis-py pipelines and transactions: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/
- redis-py advanced features for cluster transactions: https://redis.readthedocs.io/en/stable/advanced_features.html

## Issues Found
- The post created a two-shard MemoryDB cluster but used the non-cluster `redis.Redis` client against the cluster configuration endpoint. Changed the example to use `redis.cluster.RedisCluster`, which is the current redis-py client for Redis Cluster deployments.
- The transaction examples used keys that could hash to different Redis Cluster slots. Redis Cluster only supports multi-key transactions and Lua scripts when all involved keys are in the same hash slot. Added a note and changed transaction keys to use Redis Cluster hash tags.
- The CloudWatch examples used a `CommandLatency` metric and a `CommandType=write` dimension that are not documented MemoryDB metrics/dimensions. Replaced them with documented MemoryDB metrics and node-level dimensions.
- The `get-metric-statistics` example used `--statistics Average,p99`, but CloudWatch percentile values must be requested with `--extended-statistics`, not mixed into `--statistics`. The corrected MemoryDB example now uses a standard statistic for the selected metric.
- The alarm example used the same undocumented latency metric. Replaced it with an alarm on documented `ReplicationDelayedWriteCommands`.

## Review Notes
MemoryDB latency metrics `SuccessfulWriteRequestLatency` and `SuccessfulReadRequestLatency` are documented for Valkey 7.2 and later, while this post's cluster command uses engine version 7.1. For a Valkey 7.2+ version of this article, those metrics would be better direct latency examples than `ReplicationDelayedWriteCommands`.
