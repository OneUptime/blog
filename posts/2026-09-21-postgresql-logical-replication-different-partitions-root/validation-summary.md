# Validation Summary: How to Replicate PostgreSQL Partitions with publish_via_partition_root

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- PostgreSQL 18
- Logical replication, publications, subscriptions, and replica identity
- Declarative range and hash partitioning
- SQL table definitions, privileges, and data manipulation
- libpq connection settings and TLS certificate verification

## Sources Consulted
- [PostgreSQL 18: CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html) — publication syntax, root identity, partition membership, attachment, and truncation behavior.
- [PostgreSQL 18: Table Partitioning](https://www.postgresql.org/docs/18/ddl-partitioning.html) — partition bounds, hash routing, primary keys, and missing-partition errors.
- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html) — range/hash partition definitions and constraints.
- [PostgreSQL 18: Logical Replication Restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html) — alternative target layouts and unreplicated DDL.
- [PostgreSQL 18: Publication and Replica Identity](https://www.postgresql.org/docs/18/logical-replication-publication.html) — default primary-key identity and subscriber identity compatibility.
- [PostgreSQL 18: CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html) — initial copying, password requirements, privileges, transaction restrictions, and error behavior.
- [PostgreSQL 18: Subscription](https://www.postgresql.org/docs/18/logical-replication-subscription.html) — target relation matching and subscription setup.
- [PostgreSQL 18: pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html) — catalog join fields and ready-state interpretation.
- [PostgreSQL 18: Logical Replication Architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html) — initial snapshots, synchronization workers, and ongoing apply.
- [PostgreSQL 18: Logical Replication](https://www.postgresql.org/docs/18/logical-replication.html) — change delivery and subscriber consistency.
- [PostgreSQL 18: Logical Replication Security](https://www.postgresql.org/docs/18/logical-replication-security.html) — replication role attributes, initial-copy SELECT access, and subscriber ownership requirements.
- [PostgreSQL 18: Logical Replication Configuration](https://www.postgresql.org/docs/18/logical-replication-config.html) — logical WAL and server resource prerequisites.
- [PostgreSQL 18: GRANT](https://www.postgresql.org/docs/18/sql-grant.html) — schema and table privilege syntax.
- [PostgreSQL 18: SSL Support](https://www.postgresql.org/docs/18/libpq-ssl.html) — certificate trust and hostname verification for verify-full.
- [PostgreSQL 18: System Columns](https://www.postgresql.org/docs/18/ddl-system-columns.html) — physical table identification with tableoid.
- [PostgreSQL 18: UPDATE](https://www.postgresql.org/docs/18/sql-update.html) — partition-key updates and row movement.
- [PostgreSQL 18: Logical Replication Conflicts](https://www.postgresql.org/docs/18/logical-replication-conflicts.html) — apply failures and reconciliation.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves; not used as a technical source.

## Issues Found
1. **Replication prerequisites were implicit.** The original grant statements alone do not enable logical replication. Added a brief prerequisite paragraph covering logical WAL, resource capacity, LOGIN/REPLICATION attributes, and publisher database access through pg_hba.conf, with a link to the configuration documentation.
2. **The connection example omitted a password without specifying a superuser-owned subscription.** PostgreSQL 18 defaults password_required to true for non-superuser subscription owners and requires a password in the connection string. Added an explicit replacement placeholder and explained the requirement. Also clarified subscription-creation privileges, target-owner role switching, execution outside a transaction block, and the certificate trust/hostname prerequisites for the existing verify-full setting.
3. **Verification could race asynchronous apply.** The original instructions checked the subscriber immediately after publisher writes without explaining the potential delay. Updated both checks to wait for committed changes to appear, and clarified that the initial ready state does not establish that subsequent writes have arrived.

## Review Notes
- Verified the SQL examples against PostgreSQL 18 documentation. No deprecated syntax or unsupported publication options were identified.
- Both primary keys include the relevant partition key. The range boundaries cover the example dates, and the two hash remainders cover the subscriber key space. Hash placement is correctly distinguished from numeric parity.
- Root publishing supports the different subscriber partition layout and a compatible nonpartitioned target. Initial copying and later changes use the root mapping; matching publisher leaf names are unnecessary.
- The cross-date UPDATE moves a publisher row between partitions and is implemented internally as DELETE plus INSERT. The example exercises identity lookup and row movement, but does not separately demonstrate an UPDATE that stays within a publisher partition.
- The sample publisher is empty when the subscription starts. The examples demonstrate streaming changes after synchronization; a populated initial snapshot would be an additional useful future test.
- Confirmed the attachment/backfill warning, direct-leaf TRUNCATE caveat, exclusion of truncate from this publication, and need to manage DDL separately. Existing-subscription conversion advice is a migration caution, not a complete conversion procedure.
- All original documentation links resolve to the intended PostgreSQL 18 resources. The author URL redirects to the expected GitHub profile. The publisher hostname and password remain deployment placeholders.
- Validation was documentation-based. SQL was not executed against PostgreSQL 18; the locally installed server reports PostgreSQL 14.17. No runtime replication or TLS test is claimed.
