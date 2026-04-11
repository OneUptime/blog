# Validation Summary: How to Configure Redis Docker Volume Persistence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7 (redis:7-alpine Docker image)
- Docker (volumes, bind mounts, docker compose)
- Kubernetes (PersistentVolumeClaim)

## Sources Consulted
- Official Redis documentation on persistence: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis 7.0 release notes on Multi Part AOF: https://redis.io/blog/redis-7-0-is-here/
- Official Redis Docker image (redis:7-alpine) — verified UID 999 for redis user and `/data` as the working directory
- Docker Compose documentation on volumes and command syntax: https://docs.docker.com/compose/compose-file/

## Issues Found
- **Incorrect AOF file path for Redis 7**: The post stated Redis stores AOF data at `/data/appendonly.aof`. Redis 7.0+ uses Multi Part AOF, which stores AOF files in a subdirectory (`/data/appendonlydir/`) containing a manifest file, base snapshot, and incremental AOF files — not a single `appendonly.aof` file. Fixed the description to reference `/data/appendonlydir/` and explain the Multi Part AOF structure.

## Review Notes
- The `version: "3.8"` field in the docker-compose.yml examples is obsolete in Docker Compose V2 (the `docker compose` CLI plugin). It still works but triggers a deprecation warning. Not changed since it is not technically incorrect.
- The `--save "900 1"` quoted syntax in the first docker-compose example works because Redis re-parses the combined string internally, but the unquoted `--save 900 1` form used in the second example is more conventional and clearer.
- The redis user UID of 999 was verified against the official redis:7-alpine image.
- The backup and restore scripts use sound patterns (BGSAVE before backup, stop container before restore, temporary Alpine container for tar operations).
- The Kubernetes PVC example uses `storageClassName: fast-ssd` which is an example name — readers will need to substitute their own storage class.
