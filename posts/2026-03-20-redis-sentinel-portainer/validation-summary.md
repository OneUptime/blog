# Validation Summary: How to Deploy a Redis Sentinel Setup via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Redis Open Source
- Redis Sentinel
- Redis Insight
- Python (`redis-py`)
- Node.js (`ioredis`)

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis `INFO` command documentation: https://redis.io/docs/latest/commands/info/
- `redis-py` Sentinel documentation: https://redis.readthedocs.io/en/stable/_modules/redis/sentinel.html
- `ioredis` official repository and Sentinel docs: https://github.com/redis/ioredis
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker published ports documentation: https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Redis Insight Docker installation documentation: https://redis.io/docs/latest/operate/redisinsight/install/install-on-docker/

## Issues Found
- Sentinel state was being recreated from scratch on every restart by writing `/etc/sentinel.conf` at container startup. Redis Sentinel requires a writable configuration file and persists current state there across restarts, so each Sentinel was changed to use its own persisted `/data/sentinel.conf` volume and to initialize that file only on first boot.
- The compose snippet did not secure incoming Sentinel connections even though the client examples used Sentinel authentication. Redis documents `requirepass` for Sentinel password-only authentication, so `requirepass redis_master_password` was added to each Sentinel and the CLI/client examples were updated to authenticate correctly.
- The Python and Node.js client examples mixed Docker service names with host-published ports (`26380` and `26381`). Docker’s networking docs specify that service-to-service traffic uses the container port, so the internal Sentinel connections were corrected to use `26379` for all three Sentinel services.
- The `redis-py` example passed the Redis password but not Sentinel auth settings. It was updated to use `sentinel_kwargs` so the example matches the password-protected Sentinel configuration.
- The replica verification example showed `master_host:172.31.0.10` even though the replica is configured with `--replicaof redis_master 6379`. The expected output example was corrected to `master_host:redis_master` to match the configured upstream host.
- The Python read example implied immediate replica consistency. Redis replication is asynchronous, so a note was added that replica reads may briefly lag behind writes.
- The failover test assumed `redis_replica1` would always become the new master. Redis Sentinel selects the promoted replica based on priority, replication offset, and run ID, so the verification step was corrected to query Sentinel for the current master instead.
- The Portainer monitoring section and conclusion said the stack had six containers, but the compose file also deploys Redis Insight. The container count was corrected to seven.
- The conclusion described quorum as if it alone guaranteed majority failover agreement and used overly specific failover timing language. It was updated to reflect Redis Sentinel’s documented quorum-plus-majority authorization model and to avoid implying an exact cutover time.

## Review Notes
- The application connection examples now correctly describe connectivity from another container on the same Docker network. External clients would need additional NAT-safe address announcement configuration if they are not joining `redis_net`.
- Docker was not installed in this review environment, so the validation was documentation-based rather than a live container smoke test.
