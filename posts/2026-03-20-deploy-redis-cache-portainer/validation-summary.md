# Validation Summary: How to Deploy Redis as a Cache Layer via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Redis
- Docker Compose / Docker
- Prometheus
- redis_exporter
- Python
- redis-py

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Redis configuration docs: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis key eviction docs: https://redis.io/docs/latest/develop/reference/eviction/
- Redis persistence docs: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis CLI docs: https://redis.io/docs/latest/develop/tools/cli/
- Redis SET command docs: https://redis.io/docs/latest/commands/set/
- Redis INFO command docs: https://redis.io/docs/latest/commands/info/
- redis-py connection docs: https://redis.readthedocs.io/en/latest/connections.html
- Prometheus configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- redis_exporter project README: https://github.com/oliver006/redis_exporter

## Issues Found
- The Compose snippet used the top-level `version: "3.8"` key, which is obsolete in current Compose. I removed it to align the stack example with current Docker guidance.
- The Redis `command` was written as a folded string while relying on quoted arguments for `--save ""`. I converted it to list form so the arguments are passed unambiguously and match current Compose command semantics.
- Internal container addresses used `redis_cache`, which depends on the explicit `container_name`. I switched them to the service name `redis`, which is the documented Compose service-discovery hostname on the shared network.
- The cache test section mixed interactive `redis-cli` commands with shell pipes. I split the interactive Redis commands from the shell-based `INFO ... | grep ...` checks so the examples work as written.
- The Python example used an undefined `db.fetch_user` placeholder and hard-coded host settings that were brittle for a Portainer stack. I changed it to use `REDIS_URL` via `redis.from_url(...)` and added a minimal database lookup stub so the snippet is internally consistent.
- The conclusion claimed that a hit rate below 90% means the cache is too small. Redis documentation frames hit rate as workload-dependent, so I changed this to guidance based on expected hit rate, eviction count, and policy/TTL tuning.

## Review Notes
- The Prometheus scrape target `redis_exporter:9121` assumes Prometheus can resolve the exporter over the same Docker network. If Prometheus runs outside that network, the target hostname will need to change.
- `requirepass` is valid for password-protecting the default user, but Redis 6+ also supports ACL-based authentication if the deployment later needs per-client users.
- The post still uses published ports for both Redis and the exporter. That is technically fine, but in a tighter production deployment Redis is often kept internal unless host access is required.
