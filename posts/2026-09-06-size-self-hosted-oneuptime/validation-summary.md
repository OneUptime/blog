# Validation Summary: How to Size CPU, Memory, and Storage for a Self-Hosted OneUptime Deployment

## Status

validated

## Post Type

Technical capacity-planning guide. The storage formula, resource specifications, and deployment guidance warrant technical review despite the absence of executable code.

## Technologies Covered

- OneUptime self-hosting and telemetry ingestion
- ClickHouse storage, compression, retention, replication, and merges
- PostgreSQL operational state and monitoring
- Redis queues, caching, sessions, and memory
- Docker Compose and container logging
- Kubernetes resource requests and limits
- Helm database deployment options and object-storage backups

## Sources Consulted

- [OneUptime deployment sizing](https://oneuptime.com/docs/en/installation/sizing) — formula, compression assumptions, database tiers, retention, and scaling guidance.
- [OneUptime self-hosted architecture](https://oneuptime.com/docs/en/self-hosted/architecture) — datastore responsibilities, ingestion services, workers, and probes.
- [OneUptime Docker Compose installation](https://oneuptime.com/docs/en/installation/docker-compose) — minimum and recommended resources, backups, and logging considerations.
- [OneUptime Helm database options at 12.0.33](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/docs/databases.md) — verified through the [raw tagged file](https://raw.githubusercontent.com/OneUptime/oneuptime/12.0.33/HelmChart/Public/oneuptime/docs/databases.md), since the browser fetch failed. Covers standalone and operator-managed databases, replication, and backups.
- [ClickHouse TTL documentation](https://clickhouse.com/docs/concepts/features/operations/delete/ttl) — retention deletion during background merges.
- [PostgreSQL cumulative statistics](https://www.postgresql.org/docs/current/monitoring-stats.html) — activity, transactions, I/O, and vacuum monitoring.
- [Redis latency diagnosis](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/) — memory pressure and latency considerations.
- [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — scheduling requests and memory-limit OOM behavior.
- [Docker logging drivers](https://docs.docker.com/engine/logging/configure/) — log rotation and disk consumption.

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The database responsibilities, sizing table, compression examples, retention default, object-storage scope, and Compose resource figures agree with the official documentation.
- Independently checked the arithmetic: 100 / 5 × 30 × 2 × 1.3 = 1,560 GB, or 1.56 TB in decimal units. This represents aggregate capacity across both replicas, including the stated 30% headroom, rather than capacity required on each replica.
- The sizing figures and compression ratios are planning assumptions, not measured performance guarantees. OneUptime recommends at least four weeks of measurement before committing to capacity; the post's representative-week check is useful for an initial estimate but may miss longer workload cycles.
- Retention cleanup occurs during ClickHouse merges rather than immediately at expiry, supporting the advice to reserve operational headroom.
- Redis is not the durable system of record, but losing it can still discard pending queue work or sessions. Monitoring evictions remains reasonable; the sizing guide documents a default noeviction policy, so memory exhaustion can instead cause rejected writes.
- The pinned Helm documentation is valid for 12.0.33; it should not be interpreted as a claim that this is the latest release. Live sizing documentation may evolve independently.
- OneUptime's Compose documentation recommends Kubernetes for production. The quoted Compose resources remain accurate for users choosing a single-server installation.
- There are no executable code samples, CLI commands, or configuration snippets to run. Review consisted of documentation checks and arithmetic verification; no deployment or load test was performed.
