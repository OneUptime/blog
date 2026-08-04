# Allocate Shared Database Cost by Workload Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Showback, FinOps, Database, PostgreSQL, Amazon RDS, Cost Allocation, Observability

Description: Split shared database cost with query, storage, and capacity evidence instead of using revenue as a convenient but weak proxy.

---

A shared database rarely has one fair allocation driver. Compute cost follows active work, storage follows retained bytes and I/O, and connection capacity follows concurrency. Revenue share describes business size, not what caused the database bill.

The most defensible showback decomposes the bill into cost pools, assigns each pool with a related technical driver, and leaves unsupported amounts visible. It does not force every charge through one percentage.

## First Separate Direct and Shared Cost

Assign dedicated database instances, clusters, storage volumes, replicas, and licensed features directly when a single owner controls them. Only send genuinely shared cost into an allocation model.

For a shared service, create pools such as:

- provisioned database compute;
- autoscaling or serverless compute;
- primary data storage;
- backup, snapshot, and transaction-log storage;
- read and write I/O when separately charged;
- data transfer;
- database licenses or extensions;
- observability and support;
- idle resilience capacity and platform overhead.

The provider bill is the monetary numerator. Telemetry supplies allocation weights; it must not create a second cost total.

## Do Not Use Raw Query Count Alone

One query can scan billions of rows while another returns a cached key lookup. Counting both as one unit rewards expensive workloads and penalizes efficient, chatty ones.

PostgreSQL's `pg_stat_statements` extension records planning and execution statistics for normalized statement fingerprints. Relevant fields include call count, total execution time, rows, and shared block activity. Sample deltas over the showback period rather than using an unexplained lifetime total.

A compute driver can be based on execution time:

```text
team_compute_weight =
  team_total_exec_time_delta / all_teams_total_exec_time_delta
```

This is still a proxy. Elapsed execution time can include waits, and parallel execution complicates the relationship with CPU. If the database platform exposes reliable per-workload CPU or average-active-session data, use the signal closest to the constrained resource.

CloudWatch Database Insights and the continuing Performance Insights API describe database load as average active sessions and let users analyze load by dimensions such as SQL, waits, hosts, and users. That makes DB load a useful shared-compute driver when tenant or service identity is represented by a safe dimension.

## Measure Deltas and Coverage

`pg_stat_statements` is cumulative and can reset. Statements can also be evicted from the view when more distinct entries are observed than the configured capacity. PostgreSQL notes that query identifiers are not necessarily stable across major versions and other configuration changes.

For every scrape, retain:

- database identifier and server identity;
- sample start and end timestamps;
- statistics reset marker;
- user identifier, query identifier, top-level flag, and owning application dimension;
- calls, execution time, rows, and block counters;
- collection health and coverage.

Calculate a delta only when two samples belong to the same reset epoch. Put observed deltas with unknown application identities into a `MISSING_OR_UNKNOWN_TELEMETRY` pool. Treat gaps, negative deltas, and intervals in which `pg_stat_statements_info.dealloc` increases as missing coverage unless an independent total can quantify the residual; the deallocation counter reports events, not the work discarded. Never renormalize known teams to 100 percent while silently dropping unknown workload.

Avoid exposing raw SQL in showback datasets. Query text can contain identifiers or sensitive literals despite normalization. A controlled statement fingerprint and owner mapping are usually sufficient.

## Allocate Storage with Byte-Hours

Storage is a stock measured through time, not a month-end snapshot. If tenant or schema bytes are sampled daily, calculate byte-hours using the duration for which each observation applies:

```text
tenant_byte_hours = sum(observed_bytes * hours_until_next_sample)
tenant_storage_weight = tenant_byte_hours / total_tenant_byte_hours
```

Separate primary storage from shared overhead. PostgreSQL table and index size measurements may not explain transaction logs, temporary files, engine overhead, free provisioned capacity, backups, or snapshots. Allocate measurable tenant data by byte-hours, then put remaining storage into named pools with their own policy.

For provisioned RDS storage, the bill can reflect allocated capacity even when applications use less. A reasonable policy is to assign used tenant storage by byte-hours and treat unused provisioned headroom as a platform, resilience, or waste pool. Document that choice; AWS provides the capacity and billing behavior, but it does not choose your internal owner.

## Treat Connections as a Capacity Signal

Amazon RDS publishes `DatabaseConnections`, which counts client network connections but excludes some engine and RDS sessions. It is an instance-level metric, not an automatic per-team attribution source.

If connection pools expose authenticated application or tenant dimensions, connection-seconds can help allocate memory and concurrency capacity:

```text
team_connection_seconds = sum(active_or_open_connections * sample_interval)
```

Connections are usually a poor compute driver. An idle connection can hold memory and consume a slot while doing no query work. Use connections for a pool whose capacity they influence, or as a guardrail that identifies abusive pooling, not as a universal substitute for CPU or database load.

## Build a Component-Based Formula

Assume a monthly shared database bill contains:

- $12,000 compute;
- $3,000 primary storage;
- $1,000 backup storage;
- $800 I/O;
- $200 monitoring.

An explicit policy could be:

```text
team_cost =
    12,000 * team_db_load_share
  +  3,000 * team_primary_byte_hour_share
  +  1,000 * team_backup_byte_hour_share
  +    800 * team_measured_io_share
  +    200 * team_observability_policy_share
```

Do not average the five percentages and apply the result to the whole bill. Each driver belongs to its own cost pool. If reliable I/O attribution is unavailable, classify that pool as shared or allocate it with a documented fallback hierarchy.

## Create an Attribution Hierarchy

Identity is often harder than arithmetic. Prefer stable, controlled dimensions:

1. dedicated database or cluster owner;
2. authenticated database role mapped to a service;
3. controlled application name or proxy identity;
4. tenant key captured by approved instrumentation;
5. service-catalog association;
6. named unresolved bucket.

Do not trust a client-supplied application name without validation; applications can omit or spoof it. Effective-date the mapping so a current owner does not rewrite historical cost.

For connection proxies and shared service accounts, instrument the application tier or proxy. The database cannot infer a tenant that has been erased before the query reaches it.

## Reconcile and Expose Efficiency

For each cost pool, require weights to sum to one across team, central, and unresolved recipients. Then verify that allocated pool amounts equal source pool amounts before rounding.

Show cost and efficiency separately. Useful operating measures include:

- cost per request or business transaction;
- execution time and DB load by service;
- bytes retained per tenant;
- idle versus active connections;
- unallocated telemetry percentage;
- unused provisioned storage and replica capacity.

Revenue, customer count, or headcount may be an approved fallback for a truly unmeasurable corporate pool. Label it as a policy proxy. It should not replace available query, storage, or concurrency evidence merely because it is easy to obtain.

## Official Documentation

- [PostgreSQL: The pg_stat_statements extension](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL: Monitoring database activity and statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [Amazon RDS: CloudWatch metrics for Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html)
- [Amazon RDS: Database load and average active sessions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html)
- [Amazon RDS: Storage for DB instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html)
- [AWS Performance Insights API Reference](https://docs.aws.amazon.com/performance-insights/latest/APIReference/Welcome.html)

## Conclusion

Shared database showback becomes credible when cost follows the resource that each workload consumes or reserves. Split the bill into compute, storage, I/O, connection capacity, and overhead pools; choose a related driver for each; retain unknown coverage; and reconcile every pool. Revenue share can remain a declared last-resort policy, not a substitute for technical evidence.
