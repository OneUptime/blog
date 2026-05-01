# Validation Summary: How to Deploy Redis as a Cache Layer via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis
- Redis Sentinel
- Redis CLI
- Redis Insight
- Portainer
- Docker Compose
- Python
- redis-py

## Sources Consulted
- Redis key eviction docs: https://redis.io/docs/latest/develop/reference/eviction/
- Redis persistence docs: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis replication docs: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis Sentinel docs: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis CLI docs: https://redis.io/docs/latest/develop/tools/cli/
- Redis Insight Docker install docs: https://redis.io/docs/latest/operate/redisinsight/install/install-on-docker/
- redis-py docs: https://redis.readthedocs.io/en/stable/
- Docker Compose startup order docs: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose version and name docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true

## Issues Found
- The description claimed the stack included persistence, but the Redis command explicitly disabled both AOF (`appendonly no`) and RDB snapshots (`save ""`). I removed the persistence claim so the description matches the actual cache-only configuration.
- The Compose example used a top-level `version: "3.8"` field, which current Docker Compose treats as obsolete. I removed it to align the snippet with the current Compose Specification.
- The Sentinel example described a production topology in terms the snippet did not actually define. I corrected the wording so the example no longer implies the shown YAML alone creates a full 1-primary, 2-replica, 3-sentinel deployment.
- The Sentinel HA example configured `requirepass` but omitted `masterauth`, which Redis requires for replicas to authenticate to a password-protected primary and for role changes under Sentinel. I added `--masterauth password` to the Redis instances in the Sentinel example.
- The Sentinel container mounted `sentinel.conf` read-only, but Redis Sentinel requires a writable configuration file because it rewrites its state. I removed the read-only mount flag.
- The Sentinel section did not state that authenticated Redis deployments need `sentinel auth-pass` in `sentinel.conf`. I updated the text to make that requirement explicit.

## Review Notes
- The Redis cache example intentionally disables persistence. That is valid for a cache-only deployment, but operators who need warm restarts or data recovery should enable AOF and/or RDB and leave additional RAM headroom when using `maxmemory`.
- The Python caching example assumes the wrapped function returns JSON-serializable data and that the surrounding application already provides a database layer.
- Redis docs warn that Sentinel and Docker/NAT setups need careful handling around service discovery. The example keeps the services on an internal Docker network and does not publish Sentinel ports, which avoids the most common port-mapping issue.
