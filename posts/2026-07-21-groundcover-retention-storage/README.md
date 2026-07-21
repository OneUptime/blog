# Groundcover Retention with ClickHouse, VictoriaMetrics, and Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Groundcover, Data Retention, ClickHouse, VictoriaMetrics

Description: Design Groundcover retention and storage around each telemetry type, workload demand, object-storage tier, recovery goal, and deletion requirement.

---

Groundcover does not put every observability signal into one interchangeable storage pool. Its architecture uses ClickHouse for logs, traces, and Kubernetes events, and VictoriaMetrics for metrics. In BYOC deployments, customer object storage also participates in the logs, traces, and events path. Retention decisions must therefore be made per data type and tested against the behavior of each layer.

A sound policy starts with operational and legal requirements, then sizes storage from measured ingestion. It does not begin by copying a retention number from another cluster.

## Map each signal to its storage path

Groundcover's architecture overview identifies the primary stores:

| Signal | Primary store | Retention consideration |
| --- | --- | --- |
| Logs | ClickHouse | High and bursty volume; filters can target selected streams |
| Traces | ClickHouse | Sampling and payload size affect volume; filters can target selected services |
| Kubernetes events | ClickHouse | Usually smaller, but valuable for incident timelines |
| Metrics | VictoriaMetrics | Cardinality and scrape frequency drive growth; retention is global in Groundcover's current retention model |

Groundcover's BYOC disaster-recovery documentation describes object-storage offload for logs, traces, and events. It explicitly distinguishes metrics, which are not included in that offload path. Do not budget an object-storage tier as if it automatically extends metric retention.

The names ClickHouse and VictoriaMetrics explain the storage engines, but Groundcover owns the supported configuration contract around them. Apply retention through Groundcover's documented settings and support process. Direct database changes may be overwritten, conflict with application assumptions, or make upgrades harder.

## Start with a policy, not a database flag

For each data type, ask how long it remains useful and what obligation governs it:

- How far back do responders investigate incidents?
- What comparison window do capacity and reliability reviews use?
- Which logs or traces contain regulated or customer data?
- What is the maximum permitted retention for that data?
- Which signals must survive a regional or cluster failure?
- How quickly must deleted data disappear from primary storage and backups?

Separate searchable operational retention from backup retention and archival obligations. A 30-day searchable window does not automatically mean a 30-day backup lifecycle. Similarly, a backup is not a substitute for queryable retention.

At publication time, Groundcover's custom-retention page lists BYOC defaults of 30 days for logs, 7 days for traces, 7 days for Kubernetes events, and 30 days for metrics. Its log-management page still states a 3-day log default, so the official pages do not currently present one consistent number. Treat neither statement as proof of a running deployment. Existing installations, support-applied changes, product updates, or migration history may produce different values. Verify the effective configuration and the oldest queryable timestamp for each signal.

## Choose simple or targeted retention deliberately

Groundcover documents two retention approaches. Simple retention applies one duration to an entire data type. It is easy to explain and works well when the data has a uniform value and sensitivity.

Advanced retention can apply exact-match filters to logs, traces, and events. Groundcover documents that when multiple rules overlap, the shorter retention wins. Metrics currently use simple, global retention rather than targeted rules.

That overlap rule has practical consequences. Consider a production payment service that matches both a broad 30-day production rule and a narrow 7-day sensitive-data rule. The shorter rule should be expected to govern matching records. Build a small rule table with representative records and expected deletion dates before requesting or applying the configuration.

Prefer a short global baseline plus explicit longer exceptions only when the longer window has a clear owner and purpose. This reduces the risk that a new service silently inherits expensive or inappropriate retention.

For BYOC retention changes, follow the current Groundcover documentation and support workflow. Preserve the requested rule set, approval, effective date, and verification evidence in change management.

## Measure actual ingestion and compression

Raw event counts are not enough for sizing. Logs vary dramatically in message length and compressibility. Trace size depends on sampling, protocol payloads, and attributes. Metric cost depends heavily on active series cardinality, scrape interval, and churn.

Measure at least a representative busy week and capture:

- compressed bytes written per day by data type
- peak hourly ingest rate
- active metric series and churn
- trace sampling rate and average stored trace size
- log volume by namespace, service, and severity
- background compaction and merge load
- query concurrency and expensive dashboard patterns

A first capacity estimate is:

required primary bytes = daily compressed bytes x retained days x replication factor x headroom

Calculate this separately for ClickHouse and VictoriaMetrics. Add headroom for bursts, compaction, temporary files, rebalancing, and recovery. Do not use the formula as a vendor guarantee. Validate it with observed disk use and a load test because replicas, indexes, compression, and storage architecture change the result.

VictoriaMetrics recommends estimating capacity from production-like ingestion because retention, cardinality, and data shape determine resource use. Its documentation exposes retention settings in the underlying database, but Groundcover's supported interface should remain authoritative for a Groundcover deployment.

## Reduce volume before buying retention

Keeping useless data longer makes both storage and investigations worse. Reduce volume at collection:

- drop repetitive or low-value logs
- avoid collecting sensitive log sources without a purpose
- tune trace sampling by service and traffic shape
- limit captured protocol payloads
- remove unbounded metric labels
- lower unnecessary scrape frequency

Groundcover provides log drop filters, trace sampling controls, and payload-size configuration. Test changes against investigation needs before broad rollout. Payload truncation can reduce size, but it is not a privacy control because a sensitive value may appear before the cutoff.

Track the top producers over time. A single debug deployment or high-cardinality label can invalidate a quarterly capacity plan within hours.

## Treat persistent-volume expansion as a controlled change

Groundcover's custom-storage documentation describes changing persistent-volume claims for ClickHouse and VictoriaMetrics. Confirm that the storage class supports volume expansion before increasing a claim. Groundcover warns that a class without allowVolumeExpansion can require a reinstall and can risk data loss.

Before changing storage:

1. Confirm the actual storage class and expansion capability.
2. Verify free space and current growth rate.
3. Review replication and backup health.
4. Confirm the component-specific values and supported change path.
5. Test expansion in a nonproduction deployment.
6. Monitor filesystem size, pod state, merges, ingestion, and queries afterward.

More disk does not fix excessive cardinality, undersized CPU, slow storage, or an overloaded query path. Diagnose the limiting resource before resizing.

## Understand the object-storage role

In Groundcover BYOC, object storage can reduce pressure on local ClickHouse storage and support recovery for logs, traces, and events. It is still customer infrastructure that needs encryption, access control, versioning decisions, lifecycle rules, and cost monitoring.

Document:

- bucket ownership, region, and residency
- service identities and least-privilege permissions
- encryption keys and rotation
- lifecycle and deletion rules
- recovery-point and recovery-time objectives
- query behavior when older data is needed
- handling of replication, versions, and incomplete uploads

Avoid setting an object-storage lifecycle shorter than Groundcover expects. Conversely, do not assume deleting data from the searchable tier removes every object version or snapshot. Test deletion across each copy relevant to your policy.

## Keep backup, retention, and disaster recovery separate

Retention answers how long data remains available. Backup answers whether state can be restored after corruption or loss. Disaster recovery answers how the service resumes after a wider failure.

Groundcover documents ClickHouse snapshots and object-storage-based recovery for logs, traces, and events. For VictoriaMetrics, Groundcover provides a backup and restore process using the VictoriaMetrics tooling. Because metrics are excluded from the logs, traces, and events offload path, give metric backup its own recovery objective.

Run restore exercises. A successful backup job only proves that files were created; it does not prove that operators can restore the correct period, credentials, topology, and application state within the required time.

## Monitor retention as an ongoing control

Alert before disks approach exhaustion, but also monitor whether the policy is functioning:

- oldest and newest queryable timestamps per signal
- daily compressed growth
- object-storage growth and lifecycle actions
- ClickHouse merge and query performance
- VictoriaMetrics active-series growth
- failed backups and age of last verified restore
- records surviving beyond their expected deletion date

Revisit the policy after onboarding a large cluster, enabling a new protocol, changing sampling, adding a regulated workload, or changing an incident-response requirement. Retention is a product and governance decision expressed through storage, not merely a storage setting.

## Official documentation

- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover custom data retention](https://docs.groundcover.com/customization/customize-usage/custom-data-retention)
- [Groundcover log management](https://docs.groundcover.com/capabilities/log-management)
- [Groundcover custom storage](https://docs.groundcover.com/customization/customize-usage/custom-storage)
- [Groundcover BYOC disaster recovery](https://docs.groundcover.com/architecture/byoc/disaster-recovery)
- [Groundcover metric backup and restore](https://docs.groundcover.com/use-groundcover/backup-and-restore-metrics)
- [Groundcover log collection filters](https://docs.groundcover.com/customization/customize-usage/custom-logs-collection)
- [Groundcover eBPF sampling controls](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [ClickHouse data TTL](https://clickhouse.com/docs/guides/developer/ttl)
- [ClickHouse storage documentation](https://clickhouse.com/docs/operations/storing-data)
- [VictoriaMetrics single-node capacity and retention](https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/)
