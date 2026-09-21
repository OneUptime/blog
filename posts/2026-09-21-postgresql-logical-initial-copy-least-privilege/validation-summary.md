# Validation Summary: How to Grant PostgreSQL Logical Initial Copy Permissions Without Superuser

## Status

validated

## Post Type

Tutorial / permissions configuration guide.

## Technologies Covered

- PostgreSQL 18 logical replication, publications, subscriptions, and initial table synchronization.
- SQL role creation, object privileges, default privileges, and role membership.
- PostgreSQL row-level security (RLS).
- SCRAM authentication, `pg_hba.conf`, libpq connection strings, and TLS.
- `psql` password provisioning and PostgreSQL system catalogs.

## Sources Consulted

- [PostgreSQL 18: Logical Replication Security](https://www.postgresql.org/docs/18/logical-replication-security.html)
- [PostgreSQL 18: CREATE ROLE](https://www.postgresql.org/docs/18/sql-createrole.html)
- [PostgreSQL 18: GRANT](https://www.postgresql.org/docs/18/sql-grant.html)
- [PostgreSQL 18: CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html)
- [PostgreSQL 18: ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html)
- [PostgreSQL 18: CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html)
- [PostgreSQL 18: CREATE SCHEMA](https://www.postgresql.org/docs/18/sql-createschema.html)
- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html)
- [PostgreSQL 18: The pg_hba.conf File](https://www.postgresql.org/docs/18/auth-pg-hba-conf.html)
- [PostgreSQL 18: Database Connection Control Functions](https://www.postgresql.org/docs/18/libpq-connect.html)
- [PostgreSQL 18: SSL Support](https://www.postgresql.org/docs/18/libpq-ssl.html)
- [PostgreSQL 18: Row Security Policies](https://www.postgresql.org/docs/18/ddl-rowsecurity.html)
- [PostgreSQL 18: System Information Functions and Operators](https://www.postgresql.org/docs/18/functions-info.html)
- [PostgreSQL 18: pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html)
- [PostgreSQL 18: Logical Replication Configuration Settings](https://www.postgresql.org/docs/18/logical-replication-config.html)
- [PostgreSQL 18: Subscription](https://www.postgresql.org/docs/18/logical-replication-subscription.html)
- [PostgreSQL 18: Logical Replication Conflicts](https://www.postgresql.org/docs/18/logical-replication-conflicts.html)
- [PostgreSQL 18: psql](https://www.postgresql.org/docs/18/app-psql.html)
- [Author's GitHub profile](https://github.com/nawazdhandala) — checked the author link and its redirect.

## Issues Found

- **The TLS subscription could negotiate GSSAPI instead.** The connection string used `sslmode=verify-full` while the example required a `hostssl` rule and TLS identity. PostgreSQL 18 libpq gives available GSSAPI encryption precedence regardless of `sslmode`. Added `gssencmode=disable` and explained why this forces the documented TLS path. Verified the correction against the versioned libpq connection documentation; no live Kerberos or TLS connection test was performed.

## Review Notes

- Checked all SQL examples and the HBA entry against PostgreSQL 18 documentation. The publisher role attributes, database/schema/table grants, publication statement, default privileges, subscriber setup, and privilege inquiry functions use supported syntax.
- Confirmed that initial copying requires publisher-side `SELECT` in addition to replication connection authorization. Source-table or publication ownership is not required for the connection role. Publications are not an independent access-control boundary.
- Confirmed the publication creator's database `CREATE` and table ownership requirements, and the elevated requirements for all-table and schema-wide publications. Default privileges apply to future objects created by the specified role, not existing objects or objects created under another role.
- Confirmed that `pg_create_subscription` membership and database `CREATE` permit non-superuser subscription creation. The default `run_as_owner = false` requires the subscription owner to be able to assume destination table owners' roles. The example avoids additional membership grants by creating the destination table as the subscription owner.
- Confirmed the default password requirement for non-superuser-owned subscriptions, the documented `options=-crow_security=off` connection setting, and the distinction between rejecting RLS-affected queries and bypassing RLS.
- Confirmed that logical replication HBA rules match the database name, the first matching rule controls authentication, and `hostssl` requires server TLS support and configuration. `psql` supports the illustrated password command.
- Confirmed that `srsubstate = 'r'` denotes readiness for normal replication. Checking copied data and a subsequent insert provides useful validation beyond subscription creation. Repairing permission errors and re-enabling a subscription disabled by `disable_on_error` is consistent with documented behavior.
- Deployment prerequisites remain necessary: the publisher must have `wal_level = logical`, adequate replication slots and WAL senders, and the subscriber needs sufficient worker capacity. TLS certificate trust must be available to the subscriber server process using libpq; a successful test from a different operating-system account does not establish that its certificate files are accessible to subscription workers. These are configuration considerations outside this permissions-focused guide.
- Run the default slot-creating `CREATE SUBSCRIPTION` outside an explicit transaction block. The example assumes a remote publisher; a publisher in the same PostgreSQL cluster requires the documented separate-slot procedure.
- Matching column types is a valid conservative choice, although default text-format replication can support some compatible type differences. The destination example must match the actual published columns as the post states.
- All documentation links in the post resolved to the intended PostgreSQL 18 resources. The author link resolved to the expected GitHub profile. No deprecated syntax was identified in the examples.
- This was a documentation-based technical review. No live publisher/subscriber deployment or end-to-end replication test was performed.
