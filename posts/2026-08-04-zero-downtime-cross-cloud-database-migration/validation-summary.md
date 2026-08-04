# Validation Summary: Near-Zero-Downtime Database Migration Across Clouds

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- PostgreSQL 16
- PostgreSQL native logical replication and physical replication
- Change data capture (CDC) and write-ahead log (WAL) positions
- AWS Database Migration Service (AWS DMS)
- Azure Database for PostgreSQL migration service
- Google Cloud Database Migration Service
- Debezium PostgreSQL connector
- Cross-cloud cutover, data validation, sequence synchronization, and rollback

## Sources Consulted

- [PostgreSQL 16 logical replication](https://www.postgresql.org/docs/16/logical-replication.html)
- [PostgreSQL 16 logical replication restrictions](https://www.postgresql.org/docs/16/logical-replication-restrictions.html)
- [PostgreSQL 16 subscription and replication-slot management](https://www.postgresql.org/docs/16/logical-replication-subscription.html)
- [PostgreSQL 16 logical replication monitoring](https://www.postgresql.org/docs/16/logical-replication-monitoring.html)
- [PostgreSQL 16 `pg_sequences` view](https://www.postgresql.org/docs/16/view-pg-sequences.html)
- [AWS DMS change data capture](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html)
- [AWS DMS data validation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html)
- [AWS DMS PostgreSQL source documentation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html)
- [AWS DMS PostgreSQL target documentation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html)
- [Azure online migration from Amazon RDS for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/migrate/migration-service/tutorial-migration-service-rds-online)
- [Google Database Migration Service PostgreSQL quickstart](https://cloud.google.com/database-migration/docs/postgres/quickstart)
- [Google Database Migration Service PostgreSQL FAQ](https://docs.cloud.google.com/database-migration/docs/postgres/faq)
- [Google Database Migration Service PostgreSQL source configuration](https://docs.cloud.google.com/database-migration/docs/postgres/configure-source-database)
- [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)

## Issues Found

- The cutover sequence recorded the final CDC position and synchronized nonreplicated state before fencing the source writer. A missed client could therefore commit after the recorded position or sequence synchronization. Moved source-write fencing ahead of transaction draining and final-position capture so the recorded boundary is authoritative, limited pool draining to writer pools so the stated read-availability requirement can still be met, and clarified that a pre-promotion rollback must remove both the write fence and read-only mode.
- The sequence guidance said to set values above existing keys, which is unsafe as a general rule because PostgreSQL sequences can have a negative increment. Changed the guidance to choose a safe next value in the sequence's configured direction and to account for caching and application-side ID allocation.
- The Azure documentation link pointed to the online-migration tutorial for self-managed PostgreSQL on an Azure VM or on-premises host, while the migration contract illustrates Amazon RDS for PostgreSQL as the source. Updated the link to Microsoft's RDS-specific online migration tutorial.

## Review Notes

- PostgreSQL 16 documentation confirms that native logical replication does not replicate schema DDL, sequence state, or PostgreSQL large objects; the post correctly calls out all three.
- The `pg_sequences.last_value` field can be `NULL` for an unused sequence or when the reviewer lacks `USAGE` or `SELECT`, and with caching it can be ahead of the last value handed out. The post correctly treats the query as inventory and directs readers to use provider-supported synchronization methods rather than treating `last_value` as a universally safe next value.
- The managed-service support and version examples are explicitly illustrative. Exact endpoint pairs, extension support, regional availability, and current service limitations still require a migration-specific support-matrix check, as the post states.
