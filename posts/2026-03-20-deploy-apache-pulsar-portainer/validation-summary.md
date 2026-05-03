# Validation Summary: How to Deploy Apache Pulsar via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Apache Pulsar 3.2.0 (standalone mode)
- Portainer (Docker stack management)
- Docker Compose (v3.8)
- Apache Pulsar Admin REST API (v2)
- pulsar-client CLI tool
- pulsar-admin CLI tool
- pulsar-client Python library

## Sources Consulted
- Apache Pulsar Docker getting-started docs: https://pulsar.apache.org/docs/3.2.x/getting-started-docker/
- Apache Pulsar source code at tag v3.2.0:
  - `BrokersBase.java` (REST endpoints): confirmed `/admin/v2/brokers/ready` and `/admin/v2/brokers/health` are defined
  - `CmdBrokers.java`: confirmed `pulsar-admin brokers healthcheck` subcommand exists
  - `CmdProduce.java`: confirmed `-m, --messages` flag
  - `CmdConsume.java`: confirmed `-s, --subscription-name` and `-n, --num-messages` flags
  - `CmdTopics.java`: confirmed `create-partitioned-topic --partitions` and `create-subscription --subscription / --messageId` flags accept `latest`, `earliest`, or `ledgerId:entryId`
- Docker Hub: `apachepulsar/pulsar:3.2.0` is a published image tag

## Issues Found
No technical issues found. All commands, flags, REST endpoints, image tags, port mappings, volume mount paths, environment variables, and Python client API calls are correct for Apache Pulsar 3.2.0.

## Review Notes
- The post pins Pulsar to `3.2.0` (released February 2024). The latest 3.2.x patch at the time of review is `3.2.4`, which contains bug fixes; readers running this in real environments should consider bumping to the latest patch in the 3.2 line.
- The official Docker getting-started guide recommends setting `PULSAR_STANDALONE_USE_ZOOKEEPER=1` to avoid potential RocksDB-related metadata-store issues in the standalone container. The post does not include this and works without it (RocksDB is the default in 3.x), but it's worth being aware of for users hitting metadata-store issues.
- The `PULSAR_MEM=-Xms512m -Xmx512m -XX:MaxDirectMemorySize=256m` setting in Step 1 is on the lean side for a Pulsar standalone (which co-locates broker, BookKeeper, and ZooKeeper). It is sufficient for development/light testing as the post claims, and the production override in Step 6 raises it appropriately.
- The container runs as UID 10000 by default; the named volumes used here (managed by Docker) handle this correctly, but users substituting bind mounts must ensure the host directories are writable by UID 10000 or GID 0.
