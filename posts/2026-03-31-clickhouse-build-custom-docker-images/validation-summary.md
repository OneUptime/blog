# Validation Summary: How to Build Custom ClickHouse Docker Images

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (24.3)
- Docker / Dockerfile
- XML configuration (config.d / users.d)
- ClickHouse SQL (MergeTree engine)
- Container registries

## Sources Consulted
- ClickHouse Docker installation guide — https://clickhouse.com/docs/install/docker
- ClickHouse configuration files docs — https://clickhouse.com/docs/operations/configuration-files
- ClickHouse server configuration parameters — https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- Docker Hub `clickhouse/clickhouse-server` image — https://hub.docker.com/r/clickhouse/clickhouse-server/
- ClickHouse GitHub repository (entrypoint.sh) — https://github.com/ClickHouse/ClickHouse
- ClickHouse network ports docs — https://github.com/ClickHouse/clickhouse-docs/blob/main/docs/guides/sre/network-ports.md
- Docker CLI reference — https://docs.docker.com/reference/cli/docker/

## Issues Found
No technical issues found.

Verified items:
- Base image `clickhouse/clickhouse-server:24.3` is a valid Docker Hub tag.
- Override paths `/etc/clickhouse-server/config.d/` and `/etc/clickhouse-server/users.d/` are the correct modular configuration directories.
- `/docker-entrypoint-initdb.d/` correctly supports `.sql` and `.sh` scripts executed alphabetically on first startup.
- The `clickhouse:clickhouse` user/group (uid/gid 101) exists in the official image, so `chown` succeeds.
- Exposed ports 8123 (HTTP), 9000 (native TCP), 9440 (native TLS) are the documented defaults.
- `<clickhouse>` is the correct root XML element in 24.3 (legacy `<yandex>` is deprecated).
- `max_server_memory_usage_to_ram_ratio` and `max_concurrent_queries` are valid server settings; `<logger><level>` structure is correct.
- User XML structure (`<users><app><password>/<networks>/<profile>/<quota>`) is valid.
- SQL is syntactically correct: `generateUUIDv4()`, `LowCardinality(String)`, `UInt64`, `DateTime DEFAULT now()`, `ENGINE = MergeTree()`, `PARTITION BY toYYYYMM(...)`, `ORDER BY (...)` all match current ClickHouse syntax.
- `docker build`, `docker images`, `docker run`, `docker logs`, `docker tag`, `docker push` commands and flags are valid.

## Review Notes
- The plain-text `<password>changeme</password>` is valid but insecure — in production, `<password_sha256_hex>` or `<password_double_sha1_hex>` should be preferred. The post flags this as a placeholder (`changeme`) but could mention the hashed alternatives as a best practice.
- Tag `24.3` is a valid LTS release but is older; readers deploying new environments may prefer a more recent release. This is not a technical error for the post.
- The `/docker-entrypoint-initdb.d/` scripts run only when `/var/lib/clickhouse` is empty (first startup). The post correctly states "on first startup" — worth remembering when using a persistent volume across rebuilds.
