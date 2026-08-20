# Validation Summary: Feast File Registry vs SQL Registry for Concurrent Updates

## Status
validated

## Post Type
Technical guide / production operations guide

## Technologies Covered
- Feast 0.65
- Feast file, S3, GCS, and SQL registries
- PostgreSQL, MySQL, and SQLite registry backends
- SQLAlchemy database URLs and connection pooling
- Registry caching and Python feature serving
- Concurrent materialization and registry metadata updates
- Production access control, backup, recovery, and migration

## Sources Consulted
- Feast registry concepts: https://docs.feast.dev/getting-started/components/registry
- Feast online-store concepts: https://docs.feast.dev/getting-started/components/online-store
- Feast SQL registry reference: https://docs.feast.dev/reference/registries/sql
- Feast local file registry reference: https://docs.feast.dev/reference/registries/local
- Feast S3 registry reference: https://docs.feast.dev/reference/registries/s3
- Feast GCS registry reference: https://docs.feast.dev/reference/registries/gcs
- Feast production guide: https://docs.feast.dev/how-to-guides/running-feast-in-production
- Feast online-server registry-cache guidance: https://docs.feast.dev/how-to-guides/online-server-performance-tuning#registry-cache-tuning
- Feast production topology and disaster-recovery guidance: https://docs.feast.dev/how-to-guides/production-deployment-topologies#reliability-and-disaster-recovery
- Feast v0.65.0 release: https://github.com/feast-dev/feast/releases/tag/v0.65.0
- Feast v0.65.0 registry configuration: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/repo_config.py
- Feast v0.65.0 SQL registry implementation and schema: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/registry/sql.py
- Feast v0.65.0 registry cache implementation: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/registry/caching_registry.py
- Feast v0.65.0 S3 and GCS registry writers: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/registry/s3.py, https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/registry/gcs.py
- Feast v0.65.0 materialization and push implementations: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_store.py
- SQLAlchemy database URL and credential-escaping documentation: https://docs.sqlalchemy.org/en/20/core/engines.html#database-urls
- SQLAlchemy `pool_pre_ping` documentation: https://docs.sqlalchemy.org/en/20/core/engines.html#sqlalchemy.create_engine.params.pool_pre_ping
- PostgreSQL point-in-time recovery documentation: https://www.postgresql.org/docs/current/continuous-archiving.html

## Issues Found
1. **Object-store recovery assumed object versions existed.** Feast's S3 and GCS registry writers overwrite the configured object but do not enable bucket versioning. Changed the file-registry guidance and comparison table to require enabled object versioning or another backup.

2. **The SQL credential was only a literal placeholder.** Changed the URL to Feast's documented `${DB_PASSWORD}` environment-variable syntax and clarified that reserved URL characters in the supplied credential must be encoded.

3. **SQL object keys were described as names only.** Feast's SQL tables normally use composite keys containing `project_id` and the object name. Corrected the storage description and scoped the same-name conflict example to one project.

4. **The SQL recommendation omitted a serving compatibility limit.** Added the production guide's caveat that the Java feature server does not understand the SQL registry.

5. **The backup table implied point-in-time recovery was inherent to every SQL backend.** Qualified point-in-time recovery as database-specific and dependent on configuration.

6. **The teardown privilege wording was ambiguous.** Feast v0.65.0 creates missing SQL tables at registry startup, but `SqlRegistry.teardown()` deletes rows rather than dropping tables. Clarified the operations that a least-privilege role may need.

7. **The cache TTL was presented as a hard maximum staleness interval.** Distinguished the SDK's `cache_ttl_seconds` from the online server's `--registry_ttl_sec` or Operator `registryTTLSeconds` setting and noted that refresh failures can extend staleness.

8. **Push ingestion was grouped with registry metadata writers.** Feast's built-in push path reads registry definitions and writes feature values to online or offline stores; it does not update materialization history. Corrected the migration freeze step so push jobs are paused only when feature-value writes must also stop.

## Review Notes
- The file-registry concurrency warning, local-versus-object-store production distinction, and SQL-registry recommendation for concurrent materialization of different FeatureViews match Feast's official documentation.
- The S3 and SQL YAML fragments are syntactically valid. `registry_type`, `path`, `cache_ttl_seconds`, `sqlalchemy_config_kwargs`, and `pool_pre_ping` are current configuration fields or SQLAlchemy options in Feast 0.65.0.
- Feast v0.65.0 accepts a bare `postgresql://` URL and normalizes it to the Psycopg 3 dialect with a warning. Deployments still need the matching DBAPI driver, credentials, and TLS configuration.
- Applying version-controlled definitions to a fresh SQL registry does not copy file-registry materialization history. The migration checklist's explicit materialization-progress strategy and controlled canaries are therefore important.
- An online store can often be rebuilt by re-running materialization when the offline store is the complete source of truth; backing it up can reduce recovery time. Push-only online data needs a separate durability plan.
- Feast's v0.65 SQL-registry documentation says teardown drops tables, but the tagged implementation deletes rows. The correction follows the released implementation.
- All five official Feast links already present in the post returned HTTP 200 and pointed to the intended pages.
