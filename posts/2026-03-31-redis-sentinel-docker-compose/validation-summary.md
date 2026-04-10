# Validation Summary: How to Set Up Redis Sentinel with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7 (redis:7-alpine Docker image)
- Redis Sentinel (high availability / automatic failover)
- Docker Compose (container orchestration)
- Python redis-py client (Sentinel integration)

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis configuration reference: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Docker Compose specification: https://docs.docker.com/compose/compose-file/
- redis-py Sentinel client documentation: https://redis-py.readthedocs.io/en/stable/sentinel.html

## Issues Found

### 1. Shared sentinel.conf bind mount (Critical)
**What was wrong:** All three sentinel services bind-mounted the same host file (`./sentinel.conf`) as their configuration. Redis Sentinel rewrites its config file at runtime to persist state — including its unique `myid`, `known-replica`, `known-sentinel`, and `current-epoch` entries. With three containers writing to the same host file, they would corrupt each other's state and potentially end up sharing the same sentinel ID, breaking quorum and failover.

**What was changed:** Each sentinel now copies the shared config to a container-local path (`/tmp/sentinel.conf`) before starting, using `sh -c "cp /etc/redis/sentinel.conf /tmp/sentinel.conf && redis-sentinel /tmp/sentinel.conf"`. The original bind mount is marked read-only (`:ro`) to prevent accidental writes. Each container's `/tmp` is isolated, so each sentinel gets its own writable copy.

**Why:** Redis Sentinel documentation states that the configuration is rewritten every time a new sentinel or replica is discovered, or a failover is performed. Each sentinel instance must have its own writable config file.

### 2. Missing port mappings for sentinel services
**What was wrong:** The Docker Compose file did not expose any ports to the host. The Python client example connects to `localhost:26379`, `localhost:26380`, and `localhost:26381`, which would fail without port mappings.

**What was changed:** Added port mappings for all three sentinels: `26379:26379` (sentinel-1), `26380:26379` (sentinel-2), `26381:26379` (sentinel-3). This matches the ports referenced in the Python client example.

**Why:** Without port mappings, the sentinel services are only reachable from within the Docker network, making the client connection example non-functional from the host.

## Review Notes
- The `version: "3.8"` key in the Docker Compose file is deprecated in Compose V2 (which the post uses via `docker compose`). It still works but generates a warning. Removing it is optional.
- The `depends_on` configuration is inconsistent: sentinel-1 depends on all Redis services, but sentinel-2 and sentinel-3 have no dependencies. This is not a functional error since sentinels handle connection retries gracefully, but it is inconsistent.
- The Python client uses `sentinel.slave_for()` which is deprecated in redis-py 4.4.0+ in favor of `sentinel.replica_for()`. Both work, but `replica_for` is the preferred name.
- The `password` parameter in the `Sentinel()` constructor sets a default for data node connections (not sentinel connections). It is redundant with the `password` passed to `master_for()` and `slave_for()`, but not incorrect.
- When the Python client connects to sentinels from the host and asks for the master address, the sentinel will return a Docker-internal IP or hostname (e.g., `redis-primary`). This address is not routable from the host. For production use, consider `sentinel resolve-hostnames yes` and `sentinel announce-hostnames yes` in the sentinel config, or run the client inside the Docker network.
- The `socket_timeout=0.1` (100ms) in the Python client is tight but acceptable for a local Docker tutorial.
- The `redis-cli -a` flag in the healthcheck will produce a stderr warning about password on the command line. This is cosmetic and does not affect the healthcheck's exit code.
