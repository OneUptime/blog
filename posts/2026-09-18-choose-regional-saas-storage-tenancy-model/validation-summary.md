# Validation Summary: Data Residency Storage: Shared, Schema-per-Tenant, or Database-per-Region

## Status

validated

## Post Type

Technical architecture guide. Although there are no executable examples, commands, or configuration blocks, the post includes implementation details about PostgreSQL permissions, row-level security, tenant-aware constraints, schema resolution, and recovery boundaries. It therefore qualifies for technical validation.

## Technologies Covered

- PostgreSQL 18: row-level security, schemas, privileges, composite foreign keys, server resources, logical exports, and physical backups.
- SaaS multitenancy: shared tables, schemas per tenant, and databases per tenant or region.
- Regional deployment stamps, tenant routing, data residency, and cross-region replication.
- Recovery, migrations, connection pooling, and operational isolation.

## Sources Consulted

- [Microsoft: Multitenant storage and data approaches](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data) — isolation, pooling costs, noisy neighbors, schema management, and selective tenant recovery.
- [Microsoft: Deployment Stamps pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp) — regional placement, single-tenant and multitenant stamps, routing, and operational costs.
- [PostgreSQL 18: Row Security Policies](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) — policy enforcement, superuser and BYPASSRLS exemptions, and FORCE ROW LEVEL SECURITY for table owners.
- [PostgreSQL 18: Schemas](https://www.postgresql.org/docs/18/ddl-schemas.html) — database namespaces, privileges, shared cluster objects, and search_path trust.
- [PostgreSQL 18: Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) — composite keys and a tenant-aware foreign-key example.
- [PostgreSQL 18: File System Level Backup](https://www.postgresql.org/docs/18/backup-file.html) — physical backup and restoration operate on the complete database cluster.
- [PostgreSQL 18: pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html) — database-level logical exports, omitted global objects, and schema-filtered export limitations.
- [PostgreSQL 18: Resource Consumption](https://www.postgresql.org/docs/18/runtime-config-resource.html) — server-wide shared memory and resource settings.
- [Microsoft: PostgreSQL read replicas](https://learn.microsoft.com/en-us/azure/postgresql/read-replica/concepts-read-replicas) — replicas are separate servers and can hold copies in another region.
- [Author profile](https://github.com/nawazdhandala) — verified the post's author link redirects to the expected GitHub profile; not used as technical evidence.

## Issues Found

- The regional-database discussion suggested that assigning a dedicated database was sufficient for dedicated capacity or independent recovery. A PostgreSQL database can share an instance with other databases, including server resources and the physical recovery boundary. Changed this recommendation to a dedicated database instance for dedicated capacity or independent physical recovery, and explicitly stated the shared-instance limitation. Separate logical databases can still support tenant-specific logical export and restore, so the table's qualified reference to restore and maintenance options remains accurate.

## Review Notes

- Verified the distinction between logical tenant isolation and geographic deployment. Schema naming, tenant IDs, and RLS do not enforce regional placement. Regional databases can use either shared tables or tenant schemas internally.
- Confirmed the RLS role exceptions and the value of isolation tests under the actual application role. The connection-pool leakage check is an appropriate implementation recommendation; no pool-specific behavior or configuration is asserted.
- Confirmed that tenant-aware composite foreign keys can prevent cross-tenant parent references, and that schema privileges and search_path require explicit control.
- Confirmed that schema-filtered logical exports do not automatically include external object dependencies. Application files and queue state require their own migration procedures.
- Confirmed the shared physical-backup recovery concern and the need to account for replicas and temporary restore destinations. The operational cost comparisons are qualitative tradeoffs, not performance guarantees.
- Opened all external links in the post and confirmed their intended destinations. The PostgreSQL references explicitly target version 18, which the consulted documentation lists as supported. No deprecated API usage was found.
- This was a documentation-based review. There were no executable snippets to run and no deployed application or database to use for isolation, migration, or recovery exercises. Those exercises remain implementation validation recommendations in the article.
