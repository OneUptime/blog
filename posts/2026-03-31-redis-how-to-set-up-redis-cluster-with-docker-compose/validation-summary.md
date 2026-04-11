# Validation Summary: How to Set Up Redis Cluster with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7 (Cluster mode)
- Docker Compose
- Python (redis-py cluster client)
- Node.js (ioredis cluster client)
- redis-cli

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis Cluster tutorial: https://redis.io/docs/manual/scaling/
- redis-cli --cluster command reference: https://redis.io/docs/manual/cli/#cluster-mode
- redis-py cluster documentation: https://redis-py.readthedocs.io/en/stable/clustering.html
- ioredis cluster documentation: https://github.com/redis/ioredis#cluster
- Docker Compose networking reference: https://docs.docker.com/compose/networking/
- Redis configuration reference (save, cluster options): https://redis.io/docs/management/config/

## Issues Found
- **Misleading comment in "Verifying Slot Distribution" section**: The `CLUSTER KEYSLOT` command was listed twice with two different comments. The first said "Check which node owns a specific key's slot" which is incorrect — `CLUSTER KEYSLOT` only returns the hash slot number, not the owning node. To find which node owns a slot you would use `CLUSTER SLOTS` or `CLUSTER SHARDS`. Consolidated the two duplicate `CLUSTER KEYSLOT` examples into one block with the correct comment "Check which slot a key maps to."

## Review Notes
- The `version: '3.8'` field in docker-compose.yml is ignored by Docker Compose V2 and can be omitted. Not wrong, but a dated convention.
- The `docker-compose` (hyphenated) command is the legacy Python-based tool. Modern Docker installations use `docker compose` (space) as a subcommand. Both work, but `docker compose` is the current recommendation.
- On macOS with Docker Desktop, the bridge network IPs (172.20.0.x) are not routable from the host. This means clients connecting via `localhost` will receive MOVED/ASK redirects containing internal Docker IPs they cannot reach. Adding `--cluster-announce-ip 127.0.0.1` and `--cluster-announce-port <port>` to each Redis node would fix this for macOS users. On Linux, Docker bridge IPs are typically reachable from the host, so the setup works as-is.
- The startup workflow runs `docker-compose up -d` (which starts all services including the init container) and then separately runs `docker-compose run --rm redis-cluster-init`. The init container will attempt to run twice — once from `up` and once from the manual `run`. This works in practice (the second run either succeeds or reports the cluster already exists) but is redundant.
