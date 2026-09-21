# Validation Summary: How to Migrate PostgreSQL Large Objects Alongside Logical Replication

## Status

validated

## Post Type

Technical migration guide with SQL examples and command-line procedures.

## Technologies Covered

- PostgreSQL 18 native logical replication and migration cutover.
- PostgreSQL large objects, OIDs, ownership, and access privileges.
- SQL catalog queries, `bytea`, and `lo_get` conversion.
- `pg_dump`, `pg_restore`, custom archives, and selective restoration.
- libpq connection services and streaming large-object access.

## Sources Consulted

- [PostgreSQL 18: Logical Replication Restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html) — large-object, sequence, and schema replication limitations.
- [PostgreSQL 18: pg_largeobject_metadata](https://www.postgresql.org/docs/18/catalog-pg-largeobject-metadata.html) — catalog columns used by the inventory queries.
- [PostgreSQL 18: System Information Functions](https://www.postgresql.org/docs/18/functions-info.html) — `pg_get_userbyid` signature and behavior.
- [PostgreSQL 18: Large Objects](https://www.postgresql.org/docs/18/largeobjects.html) — streaming access and large-object interfaces.
- [PostgreSQL 18: Large Object Introduction](https://www.postgresql.org/docs/18/lo-intro.html) — large-object storage and size limits compared with TOASTed values.
- [PostgreSQL 18: Server-Side Large Object Functions](https://www.postgresql.org/docs/18/lo-funcs.html) — `lo_get` returns `bytea`; creation, modification, and unlinking operations.
- [PostgreSQL 18: Large Object Implementation Features](https://www.postgresql.org/docs/18/lo-implementation.html) — object ownership and read/write permissions.
- [PostgreSQL 18: Large Object Client Interfaces](https://www.postgresql.org/docs/18/lo-interfaces.html) — explicit OIDs, collision behavior, streaming reads, and transaction requirements.
- [PostgreSQL 18: pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html) — data-only dumps, large-object inclusion, custom format, table-data exclusion, and connection options.
- [PostgreSQL 18: pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html) — archive lists, selection, SQL preview, ownership, and transactional restoration.
- [PostgreSQL 18: Connection Service File](https://www.postgresql.org/docs/18/libpq-pgservice.html) — named services in libpq connection strings.
- [PostgreSQL REL_18_STABLE: pg_dump source](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/bin/pg_dump/pg_dump.c) — large-object metadata, ACL, and content archive entries in `dumpLO` and `dumpLOs`.

## Issues Found

No technical issues found.

## Review Notes

- The post is technically relevant and contains executable SQL and shell examples. No README changes were needed during this review.
- The inventory queries use documented catalog columns and function signatures. The left join correctly identifies non-null attachment OIDs with no matching large-object metadata row.
- PostgreSQL 18 does not logically replicate large objects. Replicating an application row containing an OID therefore does not transfer the corresponding payload. The separate transfer and write-freeze guidance correctly addresses that limitation.
- The conversion example correctly assigns the `bytea` result of `lo_get` to the new column. The bounded ID range limits rows, not total bytes or memory. The existing warning to measure payload sizes is appropriate: large objects can reach 4 TB, while TOASTed fields are limited to 1 GB.
- All shown dump and restore options are documented for PostgreSQL 18. `--large-objects` is current; the older `--blobs` spelling is deprecated. Archive selection must retain both large-object metadata and content, plus applicable ACL entries. Ownership is associated with object metadata rather than necessarily appearing as a separate list entry.
- `--single-transaction` already implies `--exit-on-error`; using both is valid. The instruction to review the archive and exclude unrelated sequence entries is appropriate.
- Operational prerequisites remain important: source credentials must read every transferred object, destination roles must exist for ownership and ACL restoration, and restore credentials must have the required privileges. If conversion is performed after replication is established, the new subscriber column must be provisioned separately because DDL is not replicated. These are deployment considerations, not errors in the stated pre-migration conversion approach.
- Streaming checksum implementations using libpq large-object descriptors must keep reads inside a transaction. Comparing logical payload bytes also handles sparse objects correctly. Testing through the destination application role checks permissions that table-level validation cannot establish.
- The write fence, replication drain, collision checks, payload validation, and rollback caveats form a consistent cutover procedure. A complete migration must separately handle sequence synchronization before destination writes.
- All PostgreSQL documentation links in the post resolve to the intended version-specific resources. The author profile link is not a technical reference.
- Verification was based on PostgreSQL 18 documentation and upstream source inspection. Available local `pg_dump` and `postgres` binaries report version 14.17, so no PostgreSQL 18 end-to-end migration or production database commands were executed.
