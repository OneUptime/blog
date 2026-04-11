# Validation Summary: How to Set Up Multiple Replicas in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (replication, `replicaof`, `replica-priority`, replication backlog)
- HAProxy (TCP load balancing for Redis)
- Python (`redis-py` client library)
- Bash scripting (monitoring)

## Sources Consulted
- Redis official documentation on replication: https://redis.io/docs/management/replication/
- Redis official documentation on `replica-priority`: https://redis.io/docs/management/sentinel/
- Redis configuration file reference: https://redis.io/docs/management/config/
- HAProxy documentation on `mode tcp`: https://docs.haproxy.org/2.8/configuration.html
- `redis-py` client library documentation: https://redis-py.readthedocs.io/

## Issues Found
1. **HAProxy configuration missing `mode tcp`**: The HAProxy config for proxying Redis traffic did not include `mode tcp` in the frontend or backend sections. Redis uses a binary protocol (RESP), not HTTP. Without `mode tcp`, HAProxy (especially 2.x+) may attempt to parse traffic as HTTP, causing connection failures. Added `mode tcp` to both the `frontend redis_read` and `backend redis_replicas` sections.

## Review Notes
- The `INFO replication` output still uses legacy terminology (`slave0`, `connected_slaves`) which is accurate — Redis kept these in the wire protocol and INFO output for backwards compatibility even after renaming configuration directives in Redis 5.0.
- The `replica-priority` explanation is correct: lower values are preferred for Sentinel promotion, and 0 means never promote. The inline comments in the code block accurately describe this behavior.
- The `repl-backlog-size 50mb` syntax is valid; Redis accepts human-readable size suffixes (`kb`, `mb`, `gb`) in configuration files.
- The cascaded replica section correctly notes the additional replication lag trade-off.
- The post does not mention Redis Sentinel or Redis Cluster for automatic failover, which would be a natural next step for production deployments, but this is outside the scope of the post.
