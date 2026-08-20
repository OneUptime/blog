# Feast File Registry vs SQL Registry for Concurrent Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Registry, SQL Registry, PostgreSQL, Concurrency, Production

Description: Choose a Feast registry by writer concurrency and failure recovery, not by confusing metadata storage with the online feature store.

---

The Feast registry stores metadata for projects, entities, data sources, FeatureViews, FeatureServices, and materialization progress. It does not store the feature values served by the online store.

The default file registry is simple, but every metadata change rewrites one serialized registry object. Feast documents a risk of lost updates or serialized bottlenecks with concurrent writers. The SQL registry updates individual objects atomically and is the recommended production direction when materialization jobs run concurrently.

## Understand the File Registry Boundary

A file registry can live on local disk or object storage:

```yaml
registry:
  path: s3://ml-platform-prod/feast/registry.pb
  cache_ttl_seconds: 60
```

S3 or GCS makes the file durable and remotely accessible, but it does not turn a whole-file rewrite into row-level transactions. Two jobs can read version A, independently update different FeatureViews, and both attempt to publish a complete version B. Without safe serialization, one writer's metadata can be lost.

Feast's local-registry reference says the local file option is intended only for experimentation, not production. The S3 and GCS pages say those file registries can be used in production but retain the documented whole-file concurrency limitations.

Use a file registry when:

- development is local or single-user;
- one controlled writer serializes `apply` and materialization;
- object versioning or another backup is enabled, and recovery is tested;
- concurrency and availability requirements are modest.

## Use SQL for Concurrent Production Writers

Feast's SQL registry uses SQLAlchemy and currently documents PostgreSQL, MySQL, and SQLite as tested databases:

```yaml
registry:
  registry_type: sql
  path: "postgresql://feast_writer:${DB_PASSWORD}@registry-db:5432/feast"
  cache_ttl_seconds: 60
  sqlalchemy_config_kwargs:
    pool_pre_ping: true
```

Supply the URL-encoded credential through `DB_PASSWORD` rather than committing it. Use TLS and database settings appropriate to the chosen driver and environment.

The SQL registry creates its metadata tables and stores serialized Feast objects in type-specific tables, generally keyed by project and object name. Atomic object changes make it suitable for materializing different FeatureViews concurrently. Feast explicitly recommends it for concurrent materialization correctness. Feast's production guide notes that the Java feature server does not understand the SQL registry.

SQL does not resolve semantic conflicts. If two CI pipelines apply different definitions for the same FeatureView name in one project, the database can serialize both writes while the last one still wins. Keep one authorized deployment writer per environment.

## Compare Operational Properties

| Concern | File registry | SQL registry |
| --- | --- | --- |
| local setup | simplest | requires database or SQLite |
| remote reads | object store path | database connection |
| update unit | complete serialized file | individual object |
| concurrent writers | documented risk or serialization bottleneck | atomic object changes |
| backup | file or enabled object versions | database backup; point-in-time recovery when supported and configured |
| serving cache | cache TTL can delay changes | cache TTL can delay changes |
| operational dependencies | object store | database, pool, migrations, credentials |

A highly available SQL database introduces connection limits, failover behavior, backups, and monitoring. It is not automatically safer if nobody tests restore or constrains permissions.

## Separate Read and Write Authority

The production guide recommends that CI own definition changes while training and serving clients need read access only.

Use distinct identities:

```text
deployment CI          registry read/write, infrastructure changes
materialization jobs  registry progress writes, source read, online write
training jobs         registry read, offline read
serving               registry read, online read
```

The exact database privileges required depend on Feast's registry behavior, including creation of missing tables at startup and the row deletions performed by teardown. Test a least-privilege role with every command the job actually runs.

## Plan Cache and Failure Behavior

`cache_ttl_seconds` reduces repeated registry reads for SDK clients but delays propagation. A Feast online server has a separate registry refresh interval: `--registry_ttl_sec` for `feast serve`, or `registryTTLSeconds` in the Feast Operator. During a healthy rollout, a client or server may use the old definition until its next successful refresh. Include the configured interval, and the possibility of longer staleness after refresh failures, in the deployment and rollback plan.

Exercise failures:

- writer dies during an update;
- database fails over during materialization progress update;
- two different FeatureViews materialize concurrently;
- two deployments target the same environment accidentally;
- restore brings registry metadata behind online-store schema;
- serving continues with a cached registry during an outage.

Registry and online store are separate systems, so back them up and recover them as a compatible pair. Restoring yesterday's registry against today's changed online infrastructure may be inconsistent.

## Migrate with a Frozen Writer Window

For a production migration:

1. inventory every registry reader and writer;
2. stop `apply` and materialization jobs that update registry metadata; pause push jobs only if the cutover also requires freezing online or offline feature writes;
3. export or reconstruct desired definitions from the version-controlled feature repository;
4. initialize and apply to the SQL registry in an isolated environment;
5. compare registered objects and run historical probes;
6. verify materialization progress strategy and online canaries;
7. switch readers, accounting for cache TTL;
8. enable one writer path, then concurrent materializations;
9. retain a recoverable snapshot of the file registry.

Do not copy a live file while writers are modifying it and call that a consistent migration.

## Official Documentation

- [Feast SQL registry](https://docs.feast.dev/reference/registries/sql)
- [Feast local file registry](https://docs.feast.dev/reference/registries/local)
- [Feast S3 registry](https://docs.feast.dev/reference/registries/s3)
- [Feast GCS registry](https://docs.feast.dev/reference/registries/gcs)
- [Run Feast in production](https://docs.feast.dev/how-to-guides/running-feast-in-production)

## Conclusion

Use a file registry for simple, serialized workflows and local development. Use the SQL registry when production materialization or deployment writers need atomic object updates. In both cases, enforce one definition writer per environment, plan for cache delay, and recover registry and online infrastructure coherently.
