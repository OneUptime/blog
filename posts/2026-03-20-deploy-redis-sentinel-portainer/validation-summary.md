# Validation Summary: How to Deploy Redis Sentinel via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Redis 7.2
- Redis Sentinel
- Redis replication
- Python (`redis-py`)

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis `INFO` command documentation: https://redis.io/docs/latest/commands/info/
- `redis-py` Sentinel client documentation: https://redis.readthedocs.io/en/latest/connections.html
- `redis-py` Sentinel implementation reference: https://redis.readthedocs.io/en/latest/_modules/redis/sentinel.html
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Portainer relative path volumes documentation: https://docs.portainer.io/advanced/relative-paths
- Redis Docker Official Image documentation: https://hub.docker.com/_/redis

## Issues Found
- The original stack mounted the same `sentinel.conf` into all three Sentinel containers with a relative bind mount. This was incorrect for two reasons: Sentinel persists per-instance state back into its config file, and Portainer relative-path bind mounts only apply in specific Git-based Business Edition workflows. I changed the stack to use three separate absolute host mount points so each Sentinel has its own writable config path.
- The original configuration section implied a single shared `sentinel.conf` was sufficient. I updated it to instruct readers to create three identical per-Sentinel config files on the Docker host and noted that the mounted directories must be writable by the `redis` user, which Sentinel requires in order to persist state.
- The quorum explanation was too broad. I corrected it to reflect Redis Sentinel behavior: quorum controls when a primary is marked objectively down, while the failover itself still needs authorization from a Sentinel majority.
- The `redis-py` example wrote to the primary and immediately read from a replica. Redis replication is asynchronous, so that read is not guaranteed to return the new value right away. I changed the example to read back from the primary and use `slave.ping()` to demonstrate the replica connection without implying synchronous replica reads.
- The failover test said the new primary would be available after "~10 seconds". I changed that to "After failover completes" because failover timing is not fixed by Sentinel and depends on detection, election, and reconfiguration timing.

## Review Notes
- The post now reflects valid Redis 7.2 / Sentinel behavior and current `redis-py` Sentinel APIs.
- The `redis:7.2-alpine` tag floats to the latest Redis 7.2 patch release rather than pinning an exact patch version.
- Local execution of `docker` commands was not possible in this workspace because the Docker CLI is not installed; command and configuration verification was done against official documentation, and the Compose block was parsed successfully as YAML.
