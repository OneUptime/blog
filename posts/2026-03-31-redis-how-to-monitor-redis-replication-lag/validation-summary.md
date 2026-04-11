# Validation Summary: How to Monitor Redis Replication Lag

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (replication, INFO command, client-output-buffer-limit)
- Bash scripting
- Python (redis-py client library)
- Prometheus (oliver006/redis_exporter)
- Grafana (dashboards and alerting rules)
- redis-cli (--stat, watch mode)

## Sources Consulted
- Redis INFO replication documentation: https://redis.io/docs/latest/commands/info/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- oliver006/redis_exporter metrics documentation: https://github.com/oliver006/redis_exporter
- Redis client-output-buffer-limit documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- redis-py library documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **Incorrect Prometheus metric names from redis_exporter**: The post used `redis_replication_offset` and `redis_slave_info{slave_ip,slave_port}` as metric names. The actual metric names exposed by oliver006/redis_exporter are `redis_master_repl_offset` and `redis_connected_slave_offset_bytes{slave_ip,slave_port}`. Fixed all occurrences in the Prometheus and Grafana sections.

2. **Incorrect PromQL queries**: The PromQL examples used the wrong metric names. The Prometheus section had `redis_replication_offset - on() group_left() redis_slave_info{...}` which would not work because `redis_slave_info` is an info-style metric (value of 1) with labels, not a metric containing the offset value. The Grafana section used `redis_slave_repl_offset{addr="..."}` which is not a real metric. Both were corrected to use `redis_master_repl_offset - redis_connected_slave_offset_bytes{...}`.

3. **SLOWLOG terminology error**: The post listed "SLOWLOG commands" as a cause of replica CPU saturation. SLOWLOG is a diagnostic/read-only command (`SLOWLOG GET`, `SLOWLOG LEN`, `SLOWLOG RESET`) used to inspect slow queries -- it does not itself cause CPU saturation. Changed to "slow commands" which correctly refers to the actual commands that consume CPU time and get logged by the SLOWLOG facility.

## Review Notes
- The `redis-cli --stat` suggestion in the "Monitoring with redis-cli in Watch Mode" section is technically valid but somewhat misleading in context, as `--stat` shows general server stats (keys, memory, clients, requests) rather than replication-specific metrics. The `watch` command that follows is the more relevant tool for replication monitoring. Not changed since it's not technically incorrect.
- The Python lag measurement script measures end-to-end lag including SET command latency and network round trips, not purely replication lag. The section title ("application-level lag measurement") appropriately frames this, so no change was needed.
- The `client-output-buffer-limit replica` directive uses the modern `replica` keyword (Redis 5+). Older Redis versions require `slave` instead. This is fine for a modern audience but worth noting for users on legacy Redis.
