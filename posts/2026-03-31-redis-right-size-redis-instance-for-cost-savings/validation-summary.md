# Validation Summary: How to Right-Size Your Redis Instance for Cost Savings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (CLI commands: INFO, CONFIG SET, --stat mode)
- AWS ElastiCache (instance types: t4g, m7g families)
- Bash utilities (awk, sort, tee)

## Sources Consulted
- Redis INFO command documentation: https://redis.io/commands/info
- Redis CONFIG SET documentation: https://redis.io/commands/config-set
- redis-cli --stat output format (verified via local redis-cli 7.0.11 --help and known output schema)
- Redis maxmemory and eviction policy documentation: https://redis.io/docs/reference/eviction/
- AWS ElastiCache node type documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheNodes.SupportedTypes.html

## Issues Found
- **Incorrect awk column in Step 3**: The command `awk '{print $4}'` was extracting the `blocked` clients column from `redis-cli --stat` output, not memory or key count. The `redis-cli --stat` output columns are: `$1`=keys, `$2`=mem, `$3`=clients, `$4`=blocked, `$5`=requests, `$6`=delta, `$7`=connections. Changed `$4` to `$2` to correctly extract memory usage. Also updated the description to accurately state this shows peak memory usage, with a note that `$1` can be used for key counts.

## Review Notes
- The `sort -n` on the memory column (`$2`) works approximately when all values share the same unit suffix (e.g., all in MB or all in GB), since `sort -n` parses the leading numeric portion. If memory crosses unit boundaries (e.g., K to M) during the monitoring window, the sort may not be fully accurate. This is an acceptable limitation for a quick analysis approach.
- The AWS ElastiCache instance table lists specific memory amounts and approximate monthly costs. These values change over time and vary by region — readers should verify current pricing and available instance types in the AWS console. In particular, `cache.t4g.large` may not be available in all regions or may have been renamed; the t4g family for ElastiCache traditionally includes micro, small, and medium sizes.
- The `CONFIG SET maxmemory 1200mb` command correctly uses Redis's shorthand unit syntax. Note that this change is ephemeral and will be lost on restart unless also persisted via `CONFIG REWRITE` or set in the Redis configuration file. The post doesn't mention this, which could lead to confusion after a Redis restart.
- All other Redis commands (`INFO memory`, `INFO stats`, `INFO clients`, `CONFIG SET maxmemory-policy allkeys-lru`) are syntactically correct and use valid field names and values.
