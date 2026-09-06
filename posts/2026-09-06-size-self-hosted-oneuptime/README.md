# How to Size CPU, Memory, and Storage for a Self-Hosted OneUptime Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Self-Hosting, Capacity Planning, ClickHouse, PostgreSQL

Description: Size a self-hosted OneUptime deployment from measured telemetry volume, retention, query load, monitor count, and recovery headroom.

---

OneUptime sizing is driven less by the number of people viewing dashboards than by telemetry ingest, retention, query concurrency, and monitor execution. ClickHouse usually dominates storage and memory, while PostgreSQL and Redis serve different workloads.

The figures here reflect OneUptime's current sizing guide and should be treated as starting points to validate under your own load.

## Identify each data plane

OneUptime stores configuration, users, monitors, incidents, and related operational state in PostgreSQL. It stores logs, metrics, traces, and other high-volume telemetry in ClickHouse. Redis supports queues, caching, and sessions and is not the source of truth.

That separation changes the questions to ask:

- **ClickHouse:** How many raw bytes arrive daily? How compressible are they? How long are they retained? How expensive are the dashboard queries?
- **PostgreSQL:** How many projects, monitors, incidents, workflows, and configuration objects are active?
- **Redis:** What burst rate and queue depth occur during incident or ingestion spikes?
- **Application services and probes:** How many checks run per minute, and how expensive are synthetic or custom-code checks?

## Estimate ClickHouse storage

A useful planning formula from the OneUptime guide is:

```text
required bytes = daily raw ingest / compression ratio
                 * retention days
                 * replica count
                 * 1.3 headroom
```

For example, suppose 100 GB of raw logs arrive daily, compress about 5:1, remain for 30 days, and have two replicas:

```text
100 GB / 5 * 30 * 2 * 1.3 = 1,560 GB
```

That is roughly 1.56 TB before filesystem and operational allowances outside the formula. Metrics may compress closer to the sizing guide's 2:1 example, so calculate each signal separately. Measure actual ClickHouse disk growth after a representative week instead of relying permanently on an assumed ratio.

Retention is configured per project and signal. The documented default is 15 days. Shortening noisy debug-log retention often buys more capacity than adding CPU.

Object storage does not act as an automatic low-cost telemetry tier in the standard OneUptime design. It can be used for database backup workflows, so do not subtract an object-store bucket from ClickHouse capacity.

## Choose a starting tier

OneUptime's sizing guide offers these database starting points:

| Scale | ClickHouse | PostgreSQL | Redis |
| --- | --- | --- | --- |
| Small | 4 vCPU, 16 GB RAM, 200 GB NVMe | 2 vCPU, 4 GB RAM, 50 GB | 1 vCPU, 2 GB RAM |
| Medium | 8 vCPU, 32 GB RAM, 1 to 3 TB NVMe | 4 vCPU, 8 GB RAM, 100 GB | 2 vCPU, 4 GB RAM |
| Large | 16+ vCPU, 64 to 128 GB RAM, 5 to 15 TB, sharded | 8 vCPU, 16 to 32 GB RAM, 250 GB | 4 vCPU, 8 to 16 GB RAM |

These are baselines, not automatic classifications. A small team emitting high-cardinality metrics can need a larger ClickHouse tier than a large team that only runs HTTP monitors.

For a basic Docker Compose homelab, OneUptime documents 8 GB RAM, four cores, and 20 GB disk as a minimum. Its production Compose recommendation is 16 GB RAM, eight cores, and 400 GB disk. Neither value replaces the ingest calculation.

## Measure the right workload

Run a representative test that includes normal ingest, a burst, dashboard queries, retention merges, backups, and monitor evaluations. Track:

- ClickHouse CPU, resident memory, query latency, part counts, and disk growth
- PostgreSQL connections, transaction latency, database size, and vacuum health
- Redis memory, evictions, queue depth, and latency
- ingestion rejection or retry rates
- probe queue duration and monitor execution time
- node disk latency and remaining capacity

Reserve headroom for background merges, restores, schema changes, and an unavailable replica. A volume that is comfortable during steady ingest can fill rapidly when replication or compaction catches up after an outage.

## Scale the bottleneck you observe

Add fast storage and memory to ClickHouse when merges and analytical queries contend. Reduce retention or noisy attributes before scaling indefinitely. Scale PostgreSQL for connection and transactional pressure, not because telemetry bytes increased. Add application replicas when API, workflow, or ingestion services saturate, and add probes when monitor execution queues grow.

In Kubernetes, set requests from observed steady use and limits only after testing their effect. An aggressive memory limit can turn a slow query into repeated OOM restarts. On Compose, enforce Docker log rotation so container logs do not silently consume the host volume.

Revisit the calculation whenever retention, sampling, log verbosity, replication, or new signal types change. Capacity planning is a loop, not an installation-time checkbox.

## Conclusion

Size OneUptime by data path. Estimate ClickHouse from measured ingest and retention, give stateful services fast durable storage, then validate CPU and memory against realistic queries and monitor load. Maintain enough free capacity to survive maintenance and recovery, not merely an average day.

## Official Documentation

- [OneUptime deployment sizing](https://oneuptime.com/docs/en/installation/sizing)
- [OneUptime self-hosted architecture](https://oneuptime.com/docs/en/self-hosted/architecture)
- [OneUptime Docker Compose installation](https://oneuptime.com/docs/en/installation/docker-compose)
- [OneUptime Helm database options](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/docs/databases.md)
