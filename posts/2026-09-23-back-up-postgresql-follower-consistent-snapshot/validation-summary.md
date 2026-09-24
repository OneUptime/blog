# Validation Summary: How to Back Up from a Follower Without Taking an Inconsistent Snapshot

## Status
validated

## Post Type
Guide with physical-backup, verification, and logical-export command examples.

## Technologies Covered
- PostgreSQL 18 physical streaming replication and hot standby
- Physical backups with `pg_basebackup`
- Backup manifests, SHA256 checksums, and `pg_verifybackup`
- Write-ahead logging (WAL), continuous archiving, timelines, and point-in-time recovery
- Logical exports with `pg_dump` and restoration with `pg_restore`
- libpq TLS connections and password files

## Sources Consulted
- [PostgreSQL 18: pg_basebackup](https://www.postgresql.org/docs/18/app-pgbasebackup.html)
- [PostgreSQL 18: pg_verifybackup](https://www.postgresql.org/docs/18/app-pgverifybackup.html)
- [PostgreSQL 18: pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html)
- [PostgreSQL 18: pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html)
- [PostgreSQL 18: Hot Standby](https://www.postgresql.org/docs/18/hot-standby.html)
- [PostgreSQL 18: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/18/continuous-archiving.html)
- [PostgreSQL 18: Replication Configuration](https://www.postgresql.org/docs/18/runtime-config-replication.html)
- [PostgreSQL 18: Log-Shipping Standby Servers](https://www.postgresql.org/docs/18/warm-standby.html)
- [PostgreSQL 18: System Administration Functions](https://www.postgresql.org/docs/18/functions-admin.html)
- [PostgreSQL 18: SSL Support](https://www.postgresql.org/docs/18/libpq-ssl.html)
- [PostgreSQL 18: The Password File](https://www.postgresql.org/docs/18/libpq-pgpass.html)
- [Author's GitHub profile](https://github.com/nawazdhandala) — checked the author-link destination.

## Issues Found
- **Missing replication-slot prerequisite:** The preparation paragraph accounted for WAL sender connections but omitted the temporary replication slot automatically used by the shown streaming command. Added the requirement for a free slot under `max_replication_slots` on the standby. This avoids failure when all slots are occupied or slots are disabled.
- **Incomplete description of standby logical-export coverage:** The export limitations omitted unlogged data. Added that standby dumps exclude data in unlogged tables and sequences while retaining their definitions, as documented by `pg_dump`. A consistent export must not be mistaken for coverage of data unavailable on the standby.

## Review Notes
- Checked all three command blocks against PostgreSQL 18 documentation and validated their Bash syntax. The shown flags are supported and are not deprecated. No command changes were necessary.
- Confirmed standby backup permissions, full-page-write requirements, two replication connections, promotion failure behavior, empty destinations, and plain-format tablespace mapping. Streaming supplies recovery WAL for the base backup; later recovery requires continued WAL retention.
- Confirmed that verification checks manifest-listed files and parses required WAL for plain-format backups. It excludes certain mutable recovery/configuration files and does not prove successful recovery or validate all future archived WAL. The post correctly requires separate restore tests and configuration inspection.
- Confirmed consistent single-database logical export, custom-format restoration, separate global dependencies, replay conflicts, and the lag/bloat tradeoffs of standby delay and feedback settings.
- TLS `verify-full` requires a trusted certificate chain and a certificate matching the specified host. The host, CA file, credentials, permissions, and output paths are deployment-specific prerequisites.
- Matching major-version tools are a sound recommendation; WAL parsing requires a matching `pg_verifybackup`/`pg_waldump` version. A PITR target must be after the base backup ends and reachable through retained WAL and the appropriate timeline history.
- The post's documentation URLs resolve to the intended PostgreSQL 18 resources. The author profile resolves correctly.
- This was a documentation and shell-syntax review. No live standby backup or restore was run against the illustrative internal host; runtime recovery remains an operational test.
