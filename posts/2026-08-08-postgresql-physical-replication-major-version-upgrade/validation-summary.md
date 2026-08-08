# Validation Summary: Upgrade PostgreSQL Without Cross-Version Physical Replication

## Status

validated

## Post Type

Technical upgrade and migration guide

## Technologies Covered

- PostgreSQL 17 and PostgreSQL 18
- Physical streaming replication and WAL log shipping
- `pg_upgrade`
- `pg_basebackup`
- `pg_dump`
- Built-in logical replication
- Replication slots, publications, and subscriptions
- PostgreSQL high availability and major-version cutover planning

## Sources Consulted

- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)
- [PostgreSQL 18: Upgrading a PostgreSQL Cluster](https://www.postgresql.org/docs/18/upgrading.html)
- [PostgreSQL 18: `pg_upgrade`](https://www.postgresql.org/docs/18/pgupgrade.html)
- [PostgreSQL 18 release and migration notes](https://www.postgresql.org/docs/18/release-18.html)
- [PostgreSQL 18: Warm-standby planning](https://www.postgresql.org/docs/18/warm-standby.html#STANDBY-PLANNING)
- [PostgreSQL 18: `pg_basebackup`](https://www.postgresql.org/docs/18/app-pgbasebackup.html)
- [PostgreSQL 18: `pg_dump`](https://www.postgresql.org/docs/18/app-pgdump.html)
- [PostgreSQL 18: `pg_stat_replication`](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)
- [PostgreSQL 18: Preload-library settings](https://www.postgresql.org/docs/18/runtime-config-client.html#RUNTIME-CONFIG-CLIENT-PRELOAD)
- [PostgreSQL 18: Extension packaging](https://www.postgresql.org/docs/18/extend-extensions.html)
- [PostgreSQL 18: Logical Replication](https://www.postgresql.org/docs/18/logical-replication.html)
- [PostgreSQL 18: `CREATE PUBLICATION`](https://www.postgresql.org/docs/18/sql-createpublication.html)
- [PostgreSQL 18: `CREATE SUBSCRIPTION`](https://www.postgresql.org/docs/18/sql-createsubscription.html)
- [PostgreSQL 18: Logical Replication Restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html)
- [PostgreSQL 18: Generated Column Replication](https://www.postgresql.org/docs/18/logical-replication-gencols.html)
- [PostgreSQL 18: `pg_subscription_rel`](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html)
- [PostgreSQL 18: Upgrading Logical Replication Clusters](https://www.postgresql.org/docs/18/logical-replication-upgrade.html)
- [PostgreSQL 17 release notes](https://www.postgresql.org/docs/17/release-17.html)

## Issues Found

- The warm-standby planning link used the nonexistent fragment `#WARM-STANDBY-PLANNING`. It was changed to the documented section fragment `#STANDBY-PLANNING` so the link opens the intended Planning section.
- The post said `pg_stat_replication` showed only directly connected streaming standbys. The view actually reports WAL-sender processes, can include non-physical clients and non-streaming states, and omits downstream standbys. The wording now tells readers to identify the intended physical standby rows, require `state = 'streaming'`, and check each upstream separately in a cascade.

No other technical issues were found.

## Review Notes

- The SQL examples and command-line options are valid for the PostgreSQL 17-to-18 scenario described, including PostgreSQL 18's `pg_upgrade` transfer modes and mode-specific `--check` behavior.
- PostgreSQL 18 enables data checksums by default in `initdb`; a checksum-disabled PostgreSQL 17 source therefore needs a compatibly initialized target, such as one initialized with `--no-data-checksums`. The post's instruction to use compatible settings covers this version-specific requirement.
- The physical-standby guidance correctly distinguishes the documented link-mode/`rsync` procedure from rebuilding standbys with a new-major base backup. The exact documented procedure remains important for tablespaces, relocated `pg_wal`, configuration files, physical replication slots, and rollback safety.
- The logical-replication examples correctly account for schema and DDL, sequences, large objects, replica identity, generated columns, and text-versus-binary transfer restrictions. Reaching `srsubstate = 'r'` confirms table synchronization is complete; final apply catch-up must still be verified separately at the fenced cutover, as the post instructs.
- The examples assume that authentication, privileges, TLS trust, replication-slot capacity, WAL sender capacity, and logical-replication worker settings have been configured for the deployment. In particular, a non-superuser-owned PostgreSQL 18 subscription using the default `password_required = true` must include its password in the connection string.
- PostgreSQL recommends `--quote-all-identifiers` for cross-version `pg_dump` use. Its omission does not make the shown PostgreSQL 18 command invalid, but deployments should consider it when reserved-word differences are possible.
