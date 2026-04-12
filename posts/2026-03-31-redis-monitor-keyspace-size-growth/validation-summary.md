# Validation Summary: How to Monitor Redis Keyspace Size and Growth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (CLI commands: DBSIZE, INFO keyspace, --bigkeys, --memkeys)
- Python (redis-py client library)
- Prometheus (PromQL, alerting rules)
- redis_exporter (Prometheus exporter for Redis metrics)

## Sources Consulted
- Redis CLI official documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis DBSIZE command reference: https://redis.io/docs/latest/commands/dbsize/
- Redis INFO command reference: https://redis.io/docs/latest/commands/info/
- Prometheus querying functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- redis_exporter metrics documentation: https://github.com/oliver006/redis_exporter
- redis-py (Python Redis client) documentation: https://redis-py.readthedocs.io/

## Issues Found

### 1. Incorrect PromQL function for gauge metric
- **What was wrong:** The post used `rate(redis_db_keys[5m])` and `rate(redis_db_keys[10m])` to track keyspace growth. `rate()` is designed for counter metrics (monotonically increasing) and handles counter resets, which is incorrect for a gauge like `redis_db_keys` that can both increase and decrease.
- **What was changed:** Replaced `rate()` with `deriv()`, which computes the per-second derivative using linear regression and is the correct PromQL function for gauge metrics.

### 2. Alert expression did not match annotation
- **What was wrong:** The alert used `rate(redis_db_keys[10m]) > 1000` with an annotation saying "growing faster than 1000 keys/min". Since `rate()` (and `deriv()`) return per-second values, a threshold of 1000 would mean 1000 keys/second, not per minute.
- **What was changed:** Updated the expression to `deriv(redis_db_keys[10m]) * 60 > 1000` so the threshold correctly corresponds to 1000 keys per minute as stated in the annotation.

### 3. Invalid redis-cli flag `--sleep`
- **What was wrong:** The post used `redis-cli --bigkeys --sleep 0.01`. There is no `--sleep` flag in redis-cli. The correct flag for adding delay between SCAN iterations is `-i <seconds>`.
- **What was changed:** Replaced `--sleep 0.01` with `-i 0.01` and updated the description to reference the `-i` flag and clarify it adds delay between SCAN iterations.

## Review Notes
- The `--memkeys-samples 250` implicitly enables `--memkeys`, so specifying both `--memkeys --memkeys-samples 250` is redundant but harmless. Left as-is for clarity.
- The bash script using `redis-cli DBSIZE | awk '{print $1}'` is correct because redis-cli automatically switches to raw output mode (no type prefix) when stdout is piped.
- The Python code using redis-py is correct: `r.dbsize()`, `r.info("keyspace")`, and the dictionary access patterns all match the current redis-py API.
